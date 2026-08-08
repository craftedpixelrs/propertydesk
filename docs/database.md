# Database

## Engine

Postgres 16. Managed via **Neon** in production (with the neonless
`pg` adapter) and via Docker Compose (`postgres:16-alpine`) in dev.

## Schema Source

The authoritative schema is [`prisma/schema.prisma`](../prisma/schema.prisma).
Migrations live under `prisma/migrations/`. Domain models:

| Domain | Models |
|--------|--------|
| **Auth (Better Auth core)** | `User`, `Session`, `Account`, `Verification`, `Organization`, `Member`, `Invitation` |
| **Tenant profile / billing** | `OrganizationProfile`, `SaaSPlan`, `OrganizationSubscription` |
| **Platform** | `AuditLog`, `Notification` |
| **Inventory** | `Project`, `Building`, `Entrance`, `Floor`, `Unit`, `UnitPriceHistory`, `UnitStatusHistory` |
| **CRM** | `Buyer`, `BuyerInterest`, `Activity`, `Task`, `LeadSource` |
| **Reservations** | `Reservation`, `ReservationStatusHistory` |
| **Agencies** | `AgencyConnection`, `AgencyProjectAccess`, `AgencyUnitAccessOverride`, `AgencyBuyerRegistration`, `AgencyCommissionRule` |
| **Sales** | `Sale`, `SaleStatusHistory` |
| **Payments** | `PaymentPlan`, `PaymentInstallment`, `Payment` |
| **Documents** | `Document` |
| **Commissions** | `Commission` |
| **Sharing** | `ShareLink` — opaque public-share tokens for `/p/[token]` pages |
| **Collaboration** | `Comment` — threaded comments + `@mentions` on Buyer/Sale |
| **Floor plans** | `FloorPlanArea` — SVG polygons overlaying `Floor.floorPlanUrl` |

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
- `version` columns on `Sale`, `Unit`, `Reservation` enforce optimistic
  locking at the service layer.

## Recent phase-6 migrations

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

## Composite Indexes

Every tenant-scoped list query filters on `organizationId`. The schema
includes composite indexes like `(organizationId, status)`,
`(organizationId, createdAt)`, and status/date pairs so the planner
never has to fall back to sequential scans.

## Migrations

```bash
# Apply pending migrations locally
pnpm prisma migrate deploy

# Create a new migration in dev (writes SQL + regenerates the client)
pnpm prisma migrate dev --name descriptive_name

# Reset the DB (⚠ destructive)
pnpm prisma migrate reset --force
```

## Prisma Client Generation

`pnpm prisma generate` regenerates `@prisma/client`. Runs automatically
via `postinstall`. In Docker it runs during the build stage so the
runtime image ships with the generated engine.
