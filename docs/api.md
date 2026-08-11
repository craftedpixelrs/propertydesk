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
rate-limited by Better Auth's built-in limiter.

## Domain

Everything under `/api/v1/*` requires an authenticated session and an
active organization. The dominant endpoints:

### Platform admin

- `GET/POST /platform/organizations`
- `POST /platform/organizations/:id/{suspend,activate,impersonate}`
- `PATCH /platform/organizations/:id`
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

- `GET/POST /agencies/connections`, `POST /agencies/connections/:id/{invite,revoke}`
- `POST /agencies/connections/:id/project-access`
- `POST /agencies/connections/:id/protection-days`

### Agency portal

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
- `POST /sales/:id/contract/mark-signed` — transitions
  `SENT → SIGNED`, stamps `contractSignedAt`.
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

- `POST /documents` (multipart)
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
- `GET /pdf/sale-summary/:id`
- `GET /pdf/commission-statement?agencyOrganizationId=…&from=…&to=…`

### Public microsite (Faza 8.3 C1)

Rendered by SSR routes under the marketing shell — the underlying
data comes from server actions in `projects/microsite.service.ts`.
No REST endpoint is exposed; the microsite lives at
`/p/projekat/[slug]` and reuses the same unit data structures as the
authenticated app. See [`docs/microsite.md`](./microsite.md).

### Cron

Guarded by `x-cron-secret` matching `CRON_SECRET`:

- `POST /jobs/expire-reservations`
- `POST /jobs/expire-reservation-requests`
- `POST /jobs/expire-buyer-protection`
- `POST /jobs/mark-installments-overdue`
- `POST /jobs/due-soon-notifications`
- `POST /jobs/trial-expiration-notifications`
- `POST /jobs/backup-verify`

### Health

- `GET /health` — process only.
- `GET /ready` — includes DB ping.
