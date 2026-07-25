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

## Buyers

- Phone + email are normalized (`normalizePhone`, `normalizeEmail`)
  before write. Duplicate detection matches on the normalized value.
- Duplicate warning is a **non-blocking** response — the user must
  confirm to proceed.

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

## Payment plans & payments

- A `PaymentPlan` template creates `PaymentInstallment` rows totalling
  the sale amount (Decimal tolerance ±0.02).
- Recording a payment updates:
  1. `PaymentInstallment.paidAmount` and status (`OVERDUE`/`PAID`).
  2. `PaymentPlan.status` if all installments are paid.
  3. `Sale.status` if the plan is completed.
- Reversals never delete a payment. They create a paired negative record
  with a mandatory reason. Overpayment is blocked at the service level.

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

## Documents

- Uploaded files are streamed to the configured storage provider.
  Downloads return signed URLs whose lifetime is capped at 5 minutes.
- MIME allowlist covers PDF, JPEG, PNG, DOCX, XLSX.
- Category × visibility matrix: an agency-visible document must have
  `visibility=AGENCY` **and** the agency must have project access.

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
[`docs/security.md`](./security.md#email)).
