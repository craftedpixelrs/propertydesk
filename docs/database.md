# Database

## Engine

Postgres 16 via the `pg` adapter. The live VPS uses **Supabase**
(pooled `DATABASE_URL` + direct `DIRECT_URL`). Local can be the same
project, a second Supabase project, or Docker Postgres — see
[`environments.md`](./environments.md). Neon is supported as any other
Postgres URL; it is not the current production host.

## Schema Source

The authoritative schema is [`prisma/schema.prisma`](../prisma/schema.prisma).
Migrations live under `prisma/migrations/`. Domain models:

| Domain | Models |
|--------|--------|
| **Auth (Better Auth core)** | `User`, `Session`, `Account`, `Verification`, `Organization`, `Member`, `Invitation` |
| **Tenant profile / billing** | `OrganizationProfile`, `SaaSPlan` (investor SKUs + hidden `partner` for agencies), `OrganizationSubscription` |
| **Platform** | `AuditLog`, `Notification`, `SystemHealthCheck` |
| **Inventory** | `Project`, `Building`, `Entrance`, `Floor`, `Unit`, `UnitPriceHistory`, `UnitStatusHistory` |
| **CRM** | `Buyer`, `BuyerKycChecklist`, `BuyerInterest`, `Activity`, `Task`, `LeadSource` |
| **Reservations** | `Reservation`, `ReservationStatusHistory`, `ReservationRequest` |
| **Agencies** | `AgencyConnection` (+ `referralCode`), `AgencyProjectAccess`, `AgencyUnitAccessOverride`, `AgencyBuyerRegistration`, `AgencyCommissionRule` |
| **Sales** | `Sale` (+ `contractStatus`, `vatMode`, `taxAmount`, `taxPayer`), `SaleStatusHistory`, `SaleContractTemplate` |
| **Payments** | `PaymentPlan`, `PaymentInstallment`, `Payment`, `PaymentPlanTemplate`, `PaymentPlanTemplateItem` |
| **Documents** | `Document` (categories now include `KYC`) |
| **Commissions** | `Commission` |
| **Sharing** | `ShareLink` — opaque public-share tokens for `/p/[token]` pages |
| **Collaboration** | `Comment` — threaded comments + `@mentions` on Buyer/Sale |
| **Floor plans** | `FloorPlanArea` — SVG polygons overlaying `Floor.floorPlanUrl` |

`SaaSPlan.code = partner` is a **row**, not a migration. Seed and
`scripts/apply-agency-partner-data.cjs` upsert it. Agency orgs point
their subscription at that plan. Do not add a Prisma migration for it.

## Money & Money-Like Columns

Every money column is `Decimal(14, 2)`. Every `pct` column is
`Decimal(6, 3)`. Area columns are `Decimal(10, 2)`. **Never** compute
money in JavaScript floats — use the helpers in
[`src/lib/formatters/money.ts`](../src/lib/formatters/money.ts).

## Concurrency Guards

- `sale_unit_active_uniq` — partial unique index on `sale(unitId)` where
  `status <> 'CANCELED'`. Ensures at most one active sale per unit.
- `reservation_unit_active` — partial unique index on `reservation(unitId)`
  where `status IN ('REQUESTED','APPROVED')`. Ensures at most one active
  reservation per unit.
- `reservation_request(unitId, status)` — plus service-layer guard —
  ensures at most one `PENDING` public reservation request per unit.
  Overlapping `PENDING` requests are the source of many double-book
  bugs, so `createReservationRequest` runs the check inside its own
  serialisable transaction.
- `version` columns on `Sale`, `Unit`, `Reservation` enforce optimistic
  locking at the service layer.

## Phase 6 migrations (visual & sales layer)

The 2026-08 visual/sales layer expansion added:

- `document.sortOrder`, `document.isCover` — photo gallery ordering and
  cover selection (migration `20260808014500_document_gallery_fields`).
- `organization_profile.onboardingCompletedAt` / `onboardingDismissedAt`
  — persistence for the setup wizard (`..._onboarding`).
- `share_link` table — public share tokens (`..._share_links`).
- `comment` table with `mentionedUserIds TEXT[]` — comments and
  @mentions (`..._comments`).
- `floor_plan_area` table — polygon overlays for interactive floor
  plans (`..._floor_plan_areas`). Polygons are stored as JSONB arrays of
  `{ x, y }` in the [0,1] fractional coordinate space.

## Phase 7 migrations (payment plan templates + floor plan uploads)

- `payment_plan_template` and `payment_plan_template_item` tables
  (`20260811010000_payment_plan_templates`). Two scopes:
  organisation-wide (`projectId IS NULL`) and project-level. Percentages
  must sum to exactly 100 with a 0.001% tolerance.
- New enum `DueDateAnchor` (`CONTRACT` / `HANDOVER` / `CUSTOM_OFFSET`)
  drives due-date resolution when a template is applied to a sale.
- `document.category` gained `KYC` — used by Faza 8.2 buyer KYC but
  scaffolded in this migration to avoid an enum-widening lock later.
- `floor.floorPlanUrl` is now editable through the floor-plan uploader
  on `/projekti/[id]` (no schema change — column already existed).

## Phase 8.1 migrations (sales cycle closure)

- `sale_contract_template` table — reusable pre-contract / contract
  HTML templates with `{{var}}` placeholders. `kind` uses the new
  `SaleContractKind` enum (`PRE_CONTRACT` / `CONTRACT`).
- `sale.contractStatus` (`SaleContractStatus` enum:
  `NONE` / `GENERATED` / `SENT` / `SIGNED` / `CANCELED`),
  `sale.contractSentAt`, `sale.contractSignedAt`,
  `sale.contractTemplateId` (soft FK — no cascade so template deletion
  doesn't retro-actively rewrite history).
- `reservation_request` table — public online reservation with IPS QR
  deposit. See [`docs/reservation-requests.md`](./reservation-requests.md).
- `reservation.referralCode` — mirrored from the incoming
  `ReservationRequest` when the flow originated from a referral link.
- `project.landCost`, `project.constructionCost`,
  `project.marketingCost`, `project.otherCost`, `project.budgetNote`
  — nullable Decimal(14,2) columns used by `computeProjectPnl`.

## Phase 8.2 migrations (Serbia compliance)

- `buyer_kyc_checklist` table — one row per Buyer, four boolean flags
  (`idFrontOk`, `idBackOk`, `addressProofOk`, `taxCertOk`) plus
  `reviewedAt` / `reviewedByUserId`. See [`docs/kyc.md`](./kyc.md).
- `buyer.jmbg`, `buyer.identityNumber`, `buyer.taxId` (PIB),
  `buyer.entityType` (`NATURAL` / `LEGAL`), `buyer.legalName`,
  `buyer.addressLine1`, `buyer.city`, `buyer.postalCode`,
  `buyer.country`. All nullable so existing rows stay valid.
- `sale.vatMode` (`SaleVatMode` — `NEW_BUILD_10` / `SECONDARY_MARKET_2_5` /
  `NONE`), `sale.taxAmount` (`Decimal(14,2)`), `sale.taxPayer`
  (`SaleTaxPayer` — `BUYER` / `SELLER`). Automatically populated by
  `computeSaleTax` when both `vatMode` and `finalPrice` are set.

## Phase 8.3 migrations (growth + monitoring)

- `agency_connection.referralCode` — unique 8-char short id.
  Auto-generated on first "Rotate" action in the agency profile card.
- `project.publicMicrositeEnabled`, `project.publicMicrositeSlug`
  (unique) — opt-in public project sites at `/p/projekat/[slug]`. Slug
  falls back to the internal project `slug` when null.
- `system_health_check` table — result rows from the weekly backup
  verifier and future automated checks. Enum `SystemHealthCheckKind`:
  `BACKUP_VERIFY` / `DB_MIGRATE_STATUS`. Enum
  `SystemHealthCheckStatus`: `OK` / `FAIL`.

## Composite Indexes

Every tenant-scoped list query filters on `organizationId`. The schema
includes composite indexes like `(organizationId, status)`,
`(organizationId, createdAt)`, and status/date pairs so the planner
never has to fall back to sequential scans. Faza 8 added:

- `reservation_request (organizationId, status, expiresAt)` — powers
  the expiry job.
- `reservation_request (unitId, status)` — powers the concurrency
  guard.
- `sale_contract_template (organizationId, kind, isActive)`.
- `payment_plan_template (organizationId, projectId)`.
- `system_health_check (kind, runAt)` — recent-first health lookups.

## Migrations

```bash
# Apply pending migrations locally
pnpm prisma migrate deploy

# Create a new migration in dev (writes SQL + regenerates the client)
pnpm prisma migrate dev --name descriptive_name

# Reset the DB (⚠ destructive)
pnpm prisma migrate reset --force
```

### Recovering from a partially applied migration

If `prisma migrate deploy` fails with `P3018` (e.g. an enum or table
already exists because the schema change was applied out-of-band), do
**not** hand-edit the migration SQL. Instead:

```bash
# Mark the migration as successfully applied without re-running it.
pnpm prisma migrate resolve --applied <migration-id>

# Or, if the schema change was rolled back at the DB level:
pnpm prisma migrate resolve --rolled-back <migration-id>
```

Then re-run `prisma migrate deploy`. This is how the
`20260811010000_payment_plan_templates` migration was recovered on
the Supabase deployment when its `DueDateAnchor` enum was already
present.

## Prisma Client Generation

`pnpm prisma generate` regenerates `@prisma/client`. Runs automatically
via `postinstall`. In Docker it runs during the build stage so the
runtime image ships with the generated engine. The Docker `runner`
stage additionally stages a flat `/prisma-cli/node_modules` tree so
`prisma migrate deploy` can run inside the production image — see the
Dockerfile comments for the reasoning.
