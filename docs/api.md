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

### Inventory

- `GET/POST /projects`, `GET/PATCH /projects/:id`
- `GET/POST /units`, `GET/PATCH /units/:id`
- `POST /units/:id/status`, `POST /units/:id/archive`
- `POST /projects/:id/import` (CSV/XLSX)
- `GET /projects/:id/export`

### CRM

- `GET/POST /buyers`, `GET/PATCH /buyers/:id`
- `GET /buyers/duplicates?phone=…&email=…`
- `GET/POST /activities`, `GET/POST /tasks`
- `GET/POST /reservations`, `POST /reservations/:id/{approve,reject,cancel,convert}`

### Agencies (investor-side)

- `GET/POST /agencies/connections`, `POST /agencies/connections/:id/{invite,revoke}`
- `POST /agencies/connections/:id/project-access`
- `POST /agencies/connections/:id/protection-days`

### Agency portal

- `GET /agency/offer/projects` — agency-safe project list.
- `POST /agency/registrations` — buyer registration + protection.
- `POST /agency/reservations` — via shared `ReservationService`.
- `GET /agency/commissions`

### Sales / payments / commissions

- `GET/POST /sales`, `GET /sales/:id`
- `POST /sales/:id/payment-plans`
- `GET/POST /payments`, `POST /payments/:id/reverse`
- `GET/POST /commissions`, `POST /commissions/:id/{approve,mark-invoiced,mark-paid}`

### Documents

- `POST /documents` (multipart)
- `GET /documents?entity=…&entityId=…`
- `GET /documents/:id/url` — signed URL.

### Reports & exports

- `GET /reports/{inventory,sales,buyers,reservations,payments,agency}`
- `GET /reports/export?type=…&format=csv|xlsx`

### PDFs

- `GET /pdf/unit-offer?unitId=…&buyerId=…`
- `GET /pdf/price-list?projectId=…`
- `GET /pdf/sale-summary/:id`
- `GET /pdf/commission-statement?agencyOrganizationId=…&from=…&to=…`

### Cron

Guarded by `x-cron-secret` matching `CRON_SECRET`:

- `POST /jobs/expire-reservations`
- `POST /jobs/expire-buyer-protection`
- `POST /jobs/mark-installments-overdue`
- `POST /jobs/due-soon-notifications`
- `POST /jobs/trial-expiration-notifications`

### Health

- `GET /health` — process only.
- `GET /ready` — includes DB ping.
