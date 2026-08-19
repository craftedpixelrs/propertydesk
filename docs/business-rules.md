# Business Rules

## Inventory

- Every unit belongs to a project. Optional entrance / floor scopes.
- `Unit.status` transitions go through **`UnitStatusService.transition()`**
  which appends a `UnitStatusHistory` row. Direct writes are forbidden.
- Valid statuses: `PLANNED`, `AVAILABLE`, `RESERVED`, `SOLD`, `HELD`,
  `ARCHIVED`.
- Price changes go through `updatePrice()` which appends
  `UnitPriceHistory` and records the actor.

## Reservations

- One active reservation per unit (unique partial index on statuses
  `REQUESTED` and `APPROVED`).
- On `create`, the unit's status transitions to `RESERVED` (if not
  already) and the reservation carries `sourceType` (`INTERNAL` or
  `AGENCY`) + `agencyOrganizationId` when applicable.
- Actions: `approve`, `reject`, `cancel`, `expire`, `convert`. All are
  transactional and idempotent (repeating a completed action is a
  no-op that still returns 200).
- `expire` runs from cron `POST /api/v1/jobs/expire-reservations`.

## Online reservation requests (Faza 8.1 A2)

- A public visitor can submit a reservation via `/p/[token]` when the
  share link is active and the unit is `AVAILABLE`. The endpoint
  `POST /api/v1/public/share/:token/reserve` is rate-limited (10
  requests / hour / IP) and validated with a strict Zod schema.
- Creating the request:
  1. Transitions the unit to `HELD` (not `RESERVED`, so it never
     collides with an internal reservation).
  2. Generates an IPS QR PNG for the deposit (see
     [`docs/billing/ips-qr.md`](./billing/ips-qr.md#reservation-deposits)
     and [`docs/reservation-requests.md`](./reservation-requests.md)).
  3. Stores `ipsReference` (12-digit Serbian *poziv na broj* with
     Mod-97 check digit) and `ipsQrPngPath` on the row.
  4. Emails the investor and the visitor. The visitor confirmation
     includes the IPS QR image so they can scan and pay.
- On `confirm`, the investor's action materialises a real `Reservation`
  (linked to the same buyer, upserted from `firstName`/`lastName`/
  `email`/`phone`). Unit goes from `HELD` → `RESERVED`.
- On `decline` or `expire`, the unit returns to `AVAILABLE`.
- `expiresAt` is 48 hours by default (configurable per organisation).
  The cron `POST /api/v1/jobs/expire-reservation-requests` runs every
  15 minutes.

## Buyers

- Phone + email are normalized (`normalizePhone`, `normalizeEmail`)
  before write. Duplicate detection matches on the normalized value.
- Duplicate warning is a **non-blocking** response — the user must
  confirm to proceed.
- **KYC** (Faza 8.2 B1): each Buyer has a `BuyerKycChecklist` (id
  front + back, address proof, tax certificate). Ugovor generation is
  soft-blocked until the checklist is complete. See
  [`docs/kyc.md`](./kyc.md).
- **Legal entities**: `entityType = LEGAL` unlocks `legalName` +
  `taxId` (PIB) inputs; natural persons fill `jmbg` +
  `identityNumber`. Both variants feed the contract template
  placeholders (`{{buyer.jmbg}}`, `{{buyer.pib}}`, …).

## Sales

- One active sale per unit — unique partial index on `unitId` where
  `status <> 'CANCELED'`.
- Contract price is computed decimal-safely from `listPrice - discount`.
- Commission is **snapshotted** at contract time using the deterministic
  precedence resolver: unit+agency → project+agency → connection
  default → project default.
- Reservation conversion updates the reservation status to `CONVERTED`
  and the unit status to `SOLD` in one transaction with the new sale.
- Cancellation preserves history; there are no destructive deletes.
- **VAT / RPI mode** (Faza 8.2 B2): every Sale carries `vatMode`
  (`NEW_BUILD_10` — 10% PDV, `SECONDARY_MARKET_2_5` — 2.5% porez na
  prenos apsolutnih prava, or `NONE`) and `taxPayer` (`BUYER` /
  `SELLER`). `computeSaleTax` derives `taxAmount` from `finalPrice`
  and stores it back on the row. The values are surfaced on the sale
  detail card and injected into contract PDFs as `{{tax.*}}`
  placeholders.
- **Contract generation** (Faza 8.1 A1): pressing "Generiši ugovor"
  loads the latest `SaleContractTemplate` of the requested `kind`
  (`PRE_CONTRACT` / `CONTRACT`), applies the placeholders, renders a
  PDF via `react-pdf`, uploads the file as a `Document` with
  `category = SALE`, and sets `sale.contractStatus = GENERATED` +
  `contractTemplateId`. Follow-up actions transition
  `GENERATED → SENT → SIGNED` with matching timestamps and audit rows.
  Cancellation goes to `CANCELED` (never deletes the file).

## Payment plans & payments

- A `PaymentPlan` template creates `PaymentInstallment` rows totalling
  the sale amount (Decimal tolerance ±0.02).
- Recording a payment updates:
  1. `PaymentInstallment.paidAmount` and status (`OVERDUE`/`PAID`).
  2. `PaymentPlan.status` if all installments are paid.
  3. `Sale.status` if the plan is completed.
- Reversals never delete a payment. They create a paired negative record
  with a mandatory reason. Overpayment is blocked at the service level.

### Payment plan templates (Faza 7)

- `PaymentPlanTemplate` blueprints live in `/podesavanja/planovi-otplate`
  (org-wide) and `/projekti/[id]` → **Planovi otplate**
  (project-level override).
- Items are stored in percentages (must sum to exactly 100 with a
  0.001% tolerance).
- Applying a template to a sale materialises concrete installments;
  the plan itself keeps no FK back to the template so subsequent
  template edits never mutate historical plans.
- Operators can add manual installments to an existing plan. If the
  new total exceeds `Sale.finalPrice` the UI shows a hard warning but
  still lets the operator proceed (the total drift is logged for
  audit).
- Due dates resolve based on `DueDateAnchor`:
  - `CONTRACT` — `contractDate + offsetDays`
  - `HANDOVER` — `plannedHandoverDate + offsetDays`
  - `CUSTOM_OFFSET` — `saleCreatedAt + offsetDays`

## Cash-flow & inventory analytics (Faza 8.1 A3–A5)

- **Cash-flow projection** aggregates future `PaymentInstallment`
  amounts by month and subtracts recorded `Payment` rows to project the
  next 12 months of inflow. Rendered as a stacked bar on the dashboard
  and `/izvestaji/uplate`.
- **Time-to-sale (inventory velocity)** counts days between
  `Unit.createdAt` and the first `Sale.contractDate` per unit, then
  averages per project + unit type. Shown on `/izvestaji/zalihe`.
- **Project P&L** = `SUM(Sale.finalPrice WHERE status IN
  ('CONTRACTED','COMPLETED')) − (landCost + constructionCost +
  marketingCost + otherCost)`. Nullable costs are treated as 0 for
  arithmetic but flagged in the UI so an operator knows the P&L is
  incomplete.

## Project clone (Faza 8.2 B4)

- `POST /projects/:id/clone` creates a **structure-only** copy: the
  same `Building` → `Entrance` → `Floor` skeleton plus every `Unit`
  with statuses reset to `PLANNED`. It never carries over sales,
  reservations, payments, commissions, buyers or documents.
- The service runs inside a single transaction. If any step fails the
  whole clone is rolled back — a partial project is worse than none.
- The dialog on `/projekti/[id]` lets the operator pick whether to
  copy prices and floor-plan uploads.

## Agencies

- **Buyer protection**: an agency's registered buyer is protected on
  that project for `protectionDays` days (per-connection value).
  Any other agency's registration during that window returns a fixed,
  identity-hiding Serbian message.
- **Duplicate detection** never discloses which agency claimed the
  buyer.
- Agencies see only projects they've been granted access to via
  `AgencyProjectAccess` rows. Per-unit overrides can hide additional
  units.
- Commission rules follow the strict precedence chain in
  [`src/server/services/commissions/rules.ts`](../src/server/services/commissions/rules.ts).
- **Referral code** (Faza 8.3 C2): every `AgencyConnection` can
  generate a unique 8-char `referralCode`. Public share and microsite
  URLs accept `?ref=<code>`, which sets a `PD_REFERRAL` cookie
  (90-day lifetime). Any reservation request submitted while the
  cookie is set is stamped with `referralCode`, and the resulting
  Reservation and Sale inherit the same code. `/izvestaji/agencije`
  aggregates revenue by referral code so the investor sees the value
  each agency drives even before a formal registration. See
  [`docs/referral.md`](./referral.md).

## Documents

- Uploaded files are streamed to the configured storage provider.
  Downloads return signed URLs whose lifetime is capped at 5 minutes
  (`/api/v1/documents/:id/download` streams locally or 302-redirects
  to S3).
- App delete is a soft-delete (`deletedAt`). The object remains in
  the bucket for 45 days; `POST /api/v1/jobs/purge-deleted-documents`
  then removes it and sets `storagePurgedAt`.
- MIME allowlist covers PDF, JPEG, PNG, DOCX, XLSX.
- Category × visibility matrix: an agency-visible document must have
  `visibility=AGENCY` **and** the agency must have project access.
- New categories in Faza 7 / 8: `KYC` (Buyer identity + tax proofs;
  never visible to agencies) and per-sale uploads under `SALE`
  category are grouped in the UI as "Ugovorna" vs "Dokumentacija
  stana" via `entityType` metadata.

## Public microsite (Faza 8.3 C1)

- Investor opts in per project via `publicMicrositeEnabled = true`.
  Route: `/p/projekat/[slug]` where slug is
  `publicMicrositeSlug ?? project.slug`.
- Only `AVAILABLE` and `RESERVED` (soft) units render, and only when
  `Unit.isVisibleToAgencies = true` (reuses the same visibility flag
  agencies see, avoiding a new toggle). See
  [`docs/microsite.md`](./microsite.md).

## Money

- Every column is `Decimal(14, 2)`. Every JS calculation uses
  `decimal.js`. Formatting uses `formatMoney(value, currency)` from
  [`src/lib/formatters/money.ts`](../src/lib/formatters/money.ts).
- Currency default is `EUR`. Historic values preserve their original
  currency; conversions are explicit.

## Notifications

Domain events emit notifications through the service layer. The service
layer never calls React directly. Users see them in the header bell +
`/obavestenja`; email is dispatched via the configured provider (see
[`docs/email.md`](./email.md)).
