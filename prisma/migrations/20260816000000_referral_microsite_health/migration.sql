-- Faza 8.3 — C1 (public project microsite) + C2 (referral kod) +
-- C4 (automatski backup verifier).

CREATE TYPE "SystemHealthCheckKind"   AS ENUM ('BACKUP_VERIFY', 'DB_MIGRATE_STATUS');
CREATE TYPE "SystemHealthCheckStatus" AS ENUM ('OK', 'FAIL');

-- C2 — referral code on agency connection.
ALTER TABLE "agency_connection"
    ADD COLUMN "referralCode" TEXT;
CREATE UNIQUE INDEX "agency_connection_referralCode_key"
    ON "agency_connection"("referralCode");

-- C2 — attribution column on `reservation` so reports can attribute
-- referral-driven pipeline back to the originating agency without
-- joining through `reservation_request`.
ALTER TABLE "reservation"
    ADD COLUMN "referralCode" TEXT;
CREATE INDEX "reservation_referralCode_idx"
    ON "reservation"("referralCode");

-- C1 — opt-in public microsite per project.
ALTER TABLE "project"
    ADD COLUMN "publicMicrositeEnabled" BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN "publicMicrositeSlug"    TEXT;
CREATE UNIQUE INDEX "project_publicMicrositeSlug_key"
    ON "project"("publicMicrositeSlug");

-- C4 — health-check ledger (global, not tenant-scoped).
CREATE TABLE "system_health_check" (
    "id"      TEXT                      NOT NULL,
    "kind"    "SystemHealthCheckKind"   NOT NULL,
    "status"  "SystemHealthCheckStatus" NOT NULL,
    "message" TEXT,
    "runAt"   TIMESTAMP(3)              NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_health_check_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "system_health_check_kind_runAt_idx"
    ON "system_health_check"("kind", "runAt");
