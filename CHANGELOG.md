# Changelog

All notable changes to PropertyDesk are documented here. Format loosely
follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added — Phase 7 (Security, performance, accessibility, docs)

- Global security headers (`CSP`, `HSTS` in production, `X-Frame-Options`,
  `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`).
- Application-level rate limiting on sensitive routes:
  - `POST /api/v1/reservations` (10/min/user)
  - `POST /api/v1/agency/reservations` (10/min/user)
  - `POST /api/v1/agency/registrations` (20/min/user)
- Global error pages: `not-found.tsx`, `forbidden.tsx`, `error.tsx`,
  `global-error.tsx`, and a static maintenance page at
  `/(system)/odrzavanje`.
- Optional Sentry integration via `SENTRY_DSN` — lightweight facade in
  `src/server/monitoring/` that forwards 5xx exceptions from
  `apiHandler` without adding the full SDK.
- Accessibility improvements — visible skip-to-content link,
  `prefers-reduced-motion` handling, `id="main-content"` landmark on
  dashboard `<main>`.
- Docker: HEALTHCHECK, image labels, dedicated `/app/storage` volume,
  `wget` installed for probes.
- `.dockerignore` refined (`storage/`, `.turbo`, `.cache`, `tsbuildinfo`).
- `src/lib/query-keys.ts` — per-org TanStack Query key factory to
  guarantee tenant isolation in the client cache.
- Complete `docs/` runbook suite: architecture, database, permissions,
  api, development, deployment, testing, business-rules, import-format,
  security, backup, restore, cron-jobs, incident-response,
  vps-migration, release-checklist.
- Top-level `README.md` (Serbian) linking to the docs suite.

### Added — Phase 6 (Dashboards, reports, PDFs, notifications)

- Real-aggregate dashboards for investor / agency / platform admin.
- Report suite at `/izvestaji`: inventory, sales, buyer pipeline,
  reservations, payments, agency — server-side filters + CSV/XLSX
  exports.
- PDF generation via `@react-pdf/renderer`: unit offer, project price
  list, sale summary, commission statement.
- Serbian email templates for every domain event.
- Cron endpoints for overdue installments, due-soon notifications, and
  trial-expiration warnings.
- Notification center at `/obavestenja` with category filter tabs,
  unread-only toggle, and pagination.

### Added — Phase 5 (Sales, payments, documents, commissions)

- `SaleService` with unique active-sale partial index, transactional
  reservation conversion, snapshotted commission.
- `PaymentPlanService` (manual/percentage/equal), `PaymentService` with
  no-delete reversals, `DocumentService` on the storage provider.
- `CommissionService` lifecycle: `approve`, `mark-invoiced`,
  `mark-paid`, adjustments — all audited.

### Added — Phase 4 (Agencies, buyer protection, agency portal)

- Investor-side agency connection management, project access grants,
  per-connection buyer-protection days.
- Agency portal (`/ponuda`, `/moji-kupci`, `/moje-rezervacije`,
  `/moje-provizije`, `/agencija/*`) built on agency-safe DTOs.
- Buyer registration + duplicate-detection flow that never discloses
  another agency's identity.
- Deterministic commission-rule precedence resolver.

### Added — Phase 3 (CRM, reservations, jobs, notifications)

- Buyers with normalized phone/email duplicate detection.
- Activities timeline + tasks (`Moji zadaci`, `Danas`, `Prekoračeni`,
  `Nadolazeći`).
- `ReservationService` with unique partial index on active states +
  optimistic `version` + transactional lifecycle actions.
- Cron `expire-reservations` job.
- In-app notification model, dropdown, and Serbian emails.

### Added — Phase 2 (Projects, structure, inventory, import/export)

- Projects, buildings, entrances, floors, units services + REST APIs +
  Serbian UI (list + detail tabs, mobile cards, URL-persisted filters).
- Transactional `UnitStatusService`; price change history.
- CSV/XLSX import wizard (upload → parse → map → validate → preview →
  confirm) and streaming export.

### Added — Phase 1 (Foundation, rename, platform admin)

- Renamed EstateFlow → PropertyDesk everywhere.
- Reset Neon DB with a single consolidated Prisma migration covering
  every domain model.
- Infrastructure primitives: logger, rate limiter, storage provider
  abstraction, SMTP email transport, jobs registry, extended error
  taxonomy.
- Platform admin (`SUPER_ADMIN`) module + tenant admin (org / members /
  profile / security) + quota service.
- Seed with 5 plans, super-admin from env, sample investor + agency
  organizations for e2e.
- Health + readiness endpoints.

## Notes

- The Neon reset was executed once at Phase 1 start. Every subsequent
  migration is additive.
- The application is Serbian-only (`sr-Latn`). No English UI strings
  are permitted in production copy.
