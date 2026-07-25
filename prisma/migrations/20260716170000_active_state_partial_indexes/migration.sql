-- Partial unique indexes enforcing the "at most one active reservation per
-- unit" and "at most one active sale per unit" invariants at the database
-- level. These are the concurrency-safety net for the reservation and sale
-- services — even under fully parallel requests, Postgres will reject a
-- second INSERT that would violate either rule.

CREATE UNIQUE INDEX IF NOT EXISTS "reservation_unit_active_uniq"
  ON "reservation" ("unitId")
  WHERE "status" IN ('REQUESTED', 'APPROVED');

CREATE UNIQUE INDEX IF NOT EXISTS "sale_unit_active_uniq"
  ON "sale" ("unitId")
  WHERE "status" NOT IN ('CANCELED');
