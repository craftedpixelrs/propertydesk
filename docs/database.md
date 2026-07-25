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
