# API Reference

## Conventions

- Base path: `/api/v1`.
- Every response is enveloped:

  ```json
  { "data": {…}, "error": null, "requestId": "…", "meta": { "pagination": {…} } }
  ```

- Errors follow the same envelope with `error.code` (see
  [`src/lib/api/errors.ts`](../src/lib/api/errors.ts)):

  | Code | Status | Meaning |
  |------|--------|---------|
  | `UNAUTHENTICATED` | 401 | No session. |
  | `FORBIDDEN` | 403 | Permission denied. |
  | `ORGANIZATION_SUSPENDED` | 403 | Tenant suspended. |
  | `NOT_FOUND` | 404 | Missing / tenant-scoped miss. |
  | `CONFLICT` | 409 | Business-rule violation. |
  | `VALIDATION_ERROR` | 422 | Zod payload rejected. |
  | `RATE_LIMITED` | 429 | Hit the sensitive-route bucket. |
  | `INTERNAL_ERROR` | 500 | Unhandled. Forwarded to monitoring. |

- Rate-limit info returned in headers on 429s. Every response includes
  `x-request-id`.

## Auth

Better Auth mounts at `/api/auth/*`. Frontend uses the client in
[`src/lib/api-client/*`](../src/lib/api-client/). Auth endpoints are
rate-limited by Better Auth's built-in limiter. `POST /api/auth/sign-in/email`
also applies progressive lockout (3 failures → 30m / 1h / 6h / 12h /
24h / suspend). SUPER_ADMIN unlocks via
`PATCH /api/v1/platform/users/:id` `{ unlockLogin: true }`.

## Domain

Everything under `/api/v1/*` requires an authenticated session and an
active organization. The dominant endpoints:

### Platform admin

- `GET/POST /platform/organizations` — create accepts `trialDays` and
  `activatesAt` (`YYYY-MM-DD`, Europe/Belgrade midnight). Trial length
  is counted from that midnight. Before it, member calls return
  `403 ORGANIZATION_NOT_ACTIVE` (no billing or export either).
  `SUPER_ADMIN` is exempt.
- `POST /platform/organizations/:id/{suspend,activate,impersonate}`
- `PATCH /platform/organizations/:id` — same `activatesAt` / `trialDays`.
  When `activatesAt` is sent, `trialDays` is the length from that date,
  not the remaining days from today.
- `GET/PATCH /platform/plans`
- `PATCH /platform/subscriptions/:id`
- `GET /platform/audit-log`
- `POST /platform/monitoring/backup-verify` — Faza 8.3 C4.
  Triggers the backup verifier immediately (same code path the
  weekly cron runs). Returns the resulting `SystemHealthCheck`
  row so `/administracija/monitoring` can refresh.

### Inventory

- `GET/POST /projects`, `GET/PATCH /projects/:id`
- `POST /projects/:id/clone` — Faza 8.2 B4. Copies buildings/entrances/
  floors/units (statuses reset to `PLANNED`). Body flags:
  `{ copyPrices?: boolean, copyFloorPlans?: boolean }`.
- `GET/POST /units`, `GET/PATCH /units/:id`
- `POST /units/:id/status`, `POST /units/:id/archive`
- `POST /projects/:id/units/import` (CSV/XLSX 3-step wizard) — Faza 8.2 B3
- `GET /projects/:id/export`

### CRM

- `GET/POST /buyers`, `GET/PATCH /buyers/:id`
- `POST /buyers/:id/anonymize` — `buyer.anonymize` (investor owner,
  admin, super-admin). Strips personal data. Sale amounts and contracts
  stay. See [`kyc.md`](./kyc.md).
- `GET /organization/export` — owner/admin JSON download. Still
  allowed when the organization is restricted.
- `GET /buyers/duplicates?phone=…&email=…`
- `GET/PATCH /buyers/:id/kyc` — Faza 8.2 B1. Fetch / update
  `BuyerKycChecklist` flags. See [`docs/kyc.md`](./kyc.md).
- `GET/POST /activities`, `GET/POST /tasks`
- `GET/POST /reservations`, `POST /reservations/:id/{approve,reject,cancel,convert}`

### Online reservation requests (Faza 8.1 A2)

- `GET/POST /reservation-requests` — investor-side list + create-on-behalf.
- `POST /reservation-requests/:id/{confirm,decline}` — decides a
  pending request, transitions the unit, records audit.
- Public (no auth):
  - `POST /public/share/:token/reserve` — rate-limited (10/hour/IP),
    creates a `PENDING` reservation request, returns the deposit
    IPS QR reference and download URL.
  - `GET /public/reservation-requests/:id/qr` — signed URL to the
    stored IPS QR PNG (5-minute lifetime).

### Agencies (investor-side)

- `GET/POST /agencies/connections` — create invite with `email` +
  optional `agencyName` (or `agencyOrganizationId`). New email creates
  a partner org + owner invitation; existing agency gets a connection
  in `INVITED`.
- `POST /agencies/connections/:id/{invite,revoke}`
- `POST /agencies/connections/:id/project-access`
- `POST /agencies/connections/:id/protection-days`
- `GET /agencies/connection-requests` — incoming network requests.
- `POST /agencies/connection-requests/:id/respond` — `{ action: ACCEPT|REJECT }`.

### Geo (project form)

- `GET /geo/suggest?q=` — city / municipality / address (Serbia).
- `GET /geo/geocode?q=` — postal code + lat/lng for a picked place.

### Public assets

- `GET /public/organization-logo/:organizationId` — tenant logo
  (PNG/JPEG/WebP/SVG, CSP on SVG).
- `GET /public/project-cover/:documentId` — project cover from S3.

### Project cover

- `POST /projects/cover` — upload cover image to S3.

### Public agency signup

- `POST /public/agencies/register` — rate-limited (5/hour/email).
  Creates a free `partner` agency (`verificationStatus=PENDING`).

### Agency portal

- `GET /agency/network-catalog` — teaser catalogue (`networkCatalogEnabled`).
- `GET/POST /agency/connection-requests` — list / send partnership requests (verified agencies).
- `POST /agency/connection-requests/:id/cancel`
- `GET /agency/offer/projects` — agency-safe project list.
- `POST /agency/registrations` — buyer registration + protection.
- `POST /agency/reservations` — via shared `ReservationService`.
- `GET /agency/commissions`
- `POST /agency/referral/rotate` — Faza 8.3 C2. Generates a new
  8-char `referralCode` on the caller's `AgencyConnection`. See
  [`docs/referral.md`](./referral.md).

### Sales / payments / commissions

- `GET/POST /sales`, `GET /sales/:id`
- `POST /sales/:id/payment-plan` — creates the initial plan from a
  `PaymentPlanTemplate` or from a bespoke installment list.
- `POST /sales/:id/payment-plan/installments` — adds a manual
  installment to an existing plan (Faza 7).
- `POST /sales/:id/payment-plan/apply-template` — swaps the plan for
  a template's installments; warns if the total drifts.
- `PATCH /sales/:id/tax` — Faza 8.2 B2. Sets `vatMode` +
  `taxPayer`, recomputes `taxAmount`.
- `POST /sales/:id/contract/generate` — Faza 8.1 A1. Renders the
  contract PDF from `SaleContractTemplate`, uploads to Documents,
  sets `contractStatus = GENERATED`. Body:
  `{ templateId: string, kind: "PRE_CONTRACT" | "CONTRACT" }`.
- `POST /sales/:id/contract/mark-sent` — transitions
  `GENERATED → SENT`, stamps `contractSentAt`.
- `POST /sales/:id/contract/mark-signed` — body `{ documentId }`.
  The document must belong to this sale. Transitions `SENT → SIGNED`
  (also allowed from `GENERATED`).
- `GET /sales/:id/handover` — `sale.read`. `PUT` — `sale.handover`.
- `POST /sales/:id/buyer-link` — `sale.buyer_link`. Creates or reuses `/p/kupac/[token]`.
- `GET /sales/:id/documents-zip` — `sale.dossier`. ZIP of sale documents.
- `POST /sales/:id/settlement` and `DELETE /sales/:id/settlement/:lineId` — `sale.settlement`.
- `GET /organization/message-templates` — `organization.read`. `PUT` — `organization.templates`.
- `GET/POST /payments`, `POST /payments/:id/reverse`
- `GET/POST /commissions`, `POST /commissions/:id/{approve,mark-invoiced,mark-paid}`

### Templates catalog

- `GET/POST /payment-plan-templates`, `GET/PATCH/DELETE
  /payment-plan-templates/:id` — Faza 7. Two scopes (org / project).
- `GET/POST /sale-contract-templates`, `GET/PATCH/DELETE
  /sale-contract-templates/:id` — Faza 8.1 A1. HTML with `{{var}}`
  placeholders; kind `PRE_CONTRACT` or `CONTRACT`. See
  [`docs/sale-contracts.md`](./sale-contracts.md).

### Documents

- `POST /documents` (multipart). Kategorije zgrade su `BUILDING`,
  `TICKET`, `ASSEMBLY`, `DUES`, `INVOICE`, `OTHER`.
  `visibility: RESIDENT_SHARED` sme samo za zgradu, stan, kvar ili
  skupštinu. Prilog prijave stanar stana vidi i kad je `INTERNAL`.
- `PATCH /documents/:id` — `{ visibility: INTERNAL | RESIDENT_SHARED }`
  za te iste veze. Zapisnik skupštine se otprema kao `RESIDENT_SHARED`.
- `GET /documents?entity=…&entityId=…`
- `GET /documents/:id/url` — signed URL.

### Reports & exports

- `GET /reports/{inventory,sales,buyers,reservations,payments,agency,cash-flow}`
- `GET /reports/export?type=…&format=csv|xlsx`

The `agency` report includes referral attribution columns
(reservation count + revenue by `referralCode`). The `cash-flow`
report is Faza 8.1 A3; it returns per-month projected inflow.

### PDFs

- `GET /pdf/unit-offer?unitId=…&buyerId=…`
- `GET /pdf/price-list?projectId=…`
- `GET /pdf/sale-summary/:id` — `sale.dossier`. Includes handover and settlement lines when present
- `GET /pdf/commission-statement?agencyOrganizationId=…&from=…&to=…` — `commission.statement` (investor)
- `GET /pdf/agency-commission-statement?investorOrganizationId=…&from=…&to=…` — `commission.statement` (agency)

### Public microsite (Faza 8.3 C1)

Rendered by SSR routes under the marketing shell — the underlying
data comes from server actions in `projects/microsite.service.ts`.
No REST endpoint is exposed; the microsite lives at
`/p/projekat/[slug]` and reuses the same unit data structures as the
authenticated app. See [`docs/microsite.md`](./microsite.md).

### Building managers (Faza 11, `OrganizationType.MANAGER`)

All require `requirePermission("…")` scoped to the active MANAGER
organization. Full module runbook: [`upravnici.md`](./upravnici.md).

**Buildings & units**

- `GET/POST /manager/buildings`, `GET/PATCH /manager/buildings/:id`,
  `POST /manager/buildings/:id/archive`,
  `POST /manager/buildings/:id/restore` — `building.read` /
  `building.manage`.
- `POST /manager/buildings/:id/import` — `building.import` (XLSX wizard).
- `GET/POST /manager/buildings/:id/entrances` — `building.read` /
  `building.manage` (ulazi, upsert po `code`).
- `POST /manager/buildings/:id/units` — `building.manage`.
- `PATCH /manager/units/:id`, `DELETE /manager/units/:id` —
  `building.manage` (DELETE arhivira).
- `GET/POST /manager/buildings/:id/persons` — `building.read` /
  `building.manage` (BuildingPerson lista/kreiranje).
- `POST /manager/units/:id/ownerships` — `building.manage` (create / rotate owner).

**Dues (zajedničke takse)**

- `GET/POST /manager/buildings/:id/tariffs`,
  `PATCH /manager/tariffs/:id` — `dues.read` / `dues.tariff.manage`.
- `POST /manager/buildings/:id/dues/generate` — `dues.generate`;
  idempotent per `(unitId, year, month)`.
- `GET /manager/dues/:id` — `dues.read` (charge + payments).
- `POST /manager/dues/:id/payments` — `dues.payment.record`.
- `POST /manager/dues/payments/:paymentId/reverse` — `dues.payment.reverse`.
- `POST /manager/dues/:id/write-off` — `dues.writeoff` (obavezan razlog).
- `GET /manager/dues/:id/pdf` — uplatnica PDF with IPS QR + model-97.
- `GET /manager/dues/bulk-pdf?buildingId=&year=&month=&includePaid=0|1`
  — jedan PDF sa po jednom stranom za svaku otvorenu uplatnicu zgrade
  za zadati mesec (`dues.read`).
- `POST /manager/dues/bank-statement` — `dues.bankstatement.import`
  (multipart CSV/XLSX ili JSON `{ rows: [...] }`; matching po model-97).
- `POST /manager/units/:id/adjustments` — `dues.payment.record`;
  korekcija duga po posebnom delu (`amount` ≠ 0, `reason`). Pozitivan
  iznos ulazi u saldo dužnika, negativan ga smanjuje.
- `POST /manager/dues/reminders` — `dues.reminder.send`; prima
  `{ cooldownDays?: number }` (default 7). Vraća `{ sent, failed,
  dedupedSkipped[] }`. Pokušaj se evidentira u `DuesReminderLog`.
- `GET/POST /manager/buildings/:id/expenses` — `dues.read` /
  `ticket.close` (lista + ručni unos van ticket workflow-a).

**Maintenance**

- `GET/POST /manager/tickets`, `GET/PATCH /manager/tickets/:id` —
  `ticket.read` / `ticket.manage`. Status se menja istim PATCH-om:
  `{ status, statusNote?, actualCost?, fund?, supplierId? }`.
  `COMPLETED` sa `actualCost` pravi `BuildingExpense`. Bočni panel na
  listi nije poseban endpoint — čita isti `GET`.
- `POST /manager/tickets/:id/entries` — `ticket.manage`; evidencija rada
  (`MaintenanceWorkEntry`). Telo `{ body, visibleToResident? }`. Vidljiva
  stavka šalje email prijavljivaču.
- `GET/POST /manager/suppliers`, `PATCH /manager/suppliers/:id` —
  `ticket.manage`. Katalog izvođača. `buildingId` prazan znači celu
  firmu; UI trenutno snima samo tako. Izvođač nije `User`.

**Assemblies**

- `GET/POST /manager/assemblies`, `PATCH /manager/assemblies/:id` —
  `assembly.read` / `assembly.manage`. `action` je `open-voting`
  (opcioni `votingClosesAt`), `close-voting` ili `cancel`.
- `POST /manager/assemblies/:id/items`,
  `DELETE /manager/assemblies/:id/items/:itemId` — dnevni red dok je
  skupština `SCHEDULED`.
- `POST /manager/assemblies/:id/attendance` — prisustvo (`IN_PERSON` ili
  `PROXY`) dok skupština nije zatvorena.
- `POST /manager/assemblies/:id/invitations` — `assembly.manage`.
  Email svim trenutnim vlasnicima (`role: OWNER`) sa dnevnim redom i
  linkom na portal. Vraća `{ sent, skipped }`.
- `POST /manager/agenda/:id/vote` — `assembly.vote.cast`. Upravnik
  evidentira glas dela; portal to sme samo trenutni vlasnik. Informativna
  tačka vraća konflikt.
- `GET /manager/assemblies/:id/minutes/pdf` — `assembly.minutes.generate`.

**Notices**

- `GET/POST /manager/notices`, `POST /manager/notices/:id/publish` —
  `notice.read` / `notice.manage`. Email ide licima na ciljanim
  stanovima i aktivnim nalozima portala. `EMAIL_ONLY` nije na portalu.
  Skupština i kvar u zajedničkom prostoru sami prave povezano obaveštenje.

**Residents (portal invitations)**

- `POST /manager/units/:id/residents` — `resident.manage`; creates
  `ResidentAccess`, sends magic-link email valid 14 days.
- `POST /manager/residents/:id/resend` — `resident.manage`; regeneriše
  token i šalje email ponovo (produženje za 14 dana).
- `DELETE /manager/residents/:id?reason=…` — `resident.manage`;
  revocation is immediate (next request fails cookie re-validation).

**Reports & exports**

- `GET /manager/reports/export?report=manager-{financial|debtors|expenses|maintenance}&format=csv|xlsx`
  — `report.read`. `manager-maintenance` je novi program održavanja:
  po zgradi × kategoriji daje broj otvorenih / zatvorenih tiketa, zbir
  procene i zbir stvarnog troška.
- `GET /manager/reports/godisnji/pdf?year=YYYY` — `report.read`;
  one-page annual activity report for the chairman.

**Handover from investor**

- `POST /manager/handovers` — `project.handover_manager` (INVESTOR
  side); creates a `BuildingHandoverRequest` and emails the manager.
- `POST /manager/handovers/:id/accept` — `building.handover` (MANAGER);
  one-transaction copy of structure + owners, **never JMBG**.
- `POST /manager/handovers/:id/reject` — `building.handover`.
- `POST /manager/handovers/:id/cancel` — `project.handover_manager`
  (INVESTOR), only while `PENDING`.

**Resident portal (`/stanar/*`, cookie-authenticated)**

Not in `/api/v1`. The resident portal lives under `/stanar/*` route
group and reads/writes through server actions in
`src/app/(stanar)/stanar/**`. The one JSON surface is:

- `GET /api/stanar/dues/:id/pdf` — uplatnica PDF for a resident's own
  charge; re-verifies the `pd_resident` cookie against
  `ResidentAccess` and the charge's unit before responding.
- `POST /api/v1/public/resident/tickets` — multipart; kreira
  `MaintenanceTicket` za jedinicu iz aktivnog `pd_resident` cookie-ja i
  prilaže do 5 slika kao `Document(category: TICKET,
  entityType: MaintenanceTicket)`. Scope je striktno `ResidentAccess.unitId`
  — tempered unit id vraća 403. Pri kreiranju tiketa upravnici dobijaju
  in-app notifikaciju i email (preko `listOrgMembersWithPermission` sa
  `ticket.read`).
- `GET /api/v1/public/resident/documents/:id/download` — download za
  fajl zgrade, stana ili zapisnik skupštine koji je upravnik označio
  `visibility: RESIDENT_SHARED`, ili za prilog prijave koju je stanar
  podneo ili koja je na njegovom stanu (vidljivost se za prijavu ne
  traži). Guard je `assertResidentCanReadDocument` — ista pravila kao
  lista `/stanar/dokumenti`. Pokušaj van dozvoljenih zgrada vraća 403.

### Cron

Guarded by `x-cron-secret` matching `CRON_SECRET`:

- `POST /jobs/expire-reservations` — approved reservations only; notifies the assignee
- `POST /jobs/expire-reservation-requests` — public requests past the 48-hour deadline
- `POST /jobs/expire-buyer-protection`
- `POST /jobs/mark-installments-overdue`
- `POST /jobs/due-soon-notifications` — salesperson reminder, buyer emails, deadline tasks
- `POST /jobs/trial-expiration-notifications`
- `POST /jobs/backup-verify`
- `POST /jobs/purge-deleted-documents`
- `POST /jobs/manager-generate-dues` — Faza 11; monthly 02:00 UTC on
  day 1. Walks every active MANAGER org and generates `DuesCharge` rows
  from the effective `DuesTariff` set. Idempotent.

### Health

- `GET /health` — process only.
- `GET /ready` — includes DB ping.
