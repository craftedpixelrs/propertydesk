-- Idempotent re-application of the phase-6 migrations. Safe to run
-- multiple times: every DDL uses IF (NOT) EXISTS guards or is wrapped
-- in a DO block that checks pg_catalog before mutating.
--
-- We DO NOT touch `_prisma_migrations` — those rows are already in
-- place (that's why `prisma migrate deploy` said "up to date"). We
-- only bring the actual schema into alignment with them.

-- === 20260808014500_document_gallery_fields ================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1
                 FROM information_schema.columns
                 WHERE table_name = 'document' AND column_name = 'sortOrder') THEN
    ALTER TABLE "document" ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1
                 FROM information_schema.columns
                 WHERE table_name = 'document' AND column_name = 'isCover') THEN
    ALTER TABLE "document" ADD COLUMN "isCover" BOOLEAN NOT NULL DEFAULT FALSE;
  END IF;
END $$;

-- === 20260808014600_organization_profile_onboarding ========================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1
                 FROM information_schema.columns
                 WHERE table_name = 'organization_profile'
                   AND column_name = 'onboardingCompletedAt') THEN
    ALTER TABLE "organization_profile"
      ADD COLUMN "onboardingCompletedAt" TIMESTAMP(3);
  END IF;
  IF NOT EXISTS (SELECT 1
                 FROM information_schema.columns
                 WHERE table_name = 'organization_profile'
                   AND column_name = 'onboardingDismissedAt') THEN
    ALTER TABLE "organization_profile"
      ADD COLUMN "onboardingDismissedAt" TIMESTAMP(3);
  END IF;
END $$;

-- === 20260808014700_share_links ============================================
CREATE TABLE IF NOT EXISTS "share_link" (
    "id"              TEXT      NOT NULL,
    "organizationId"  TEXT      NOT NULL,
    "entityType"      TEXT      NOT NULL,
    "entityId"        TEXT      NOT NULL,
    "token"           TEXT      NOT NULL,
    "createdByUserId" TEXT      NOT NULL,
    "showPrice"       BOOLEAN   NOT NULL DEFAULT TRUE,
    "expiresAt"       TIMESTAMP(3),
    "revokedAt"       TIMESTAMP(3),
    "viewCount"       INTEGER   NOT NULL DEFAULT 0,
    "lastViewedAt"    TIMESTAMP(3),
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "share_link_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "share_link_token_key"
    ON "share_link"("token");
CREATE INDEX IF NOT EXISTS "share_link_organizationId_entityType_entityId_idx"
    ON "share_link"("organizationId", "entityType", "entityId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                 WHERE conname = 'share_link_organizationId_fkey') THEN
    ALTER TABLE "share_link"
      ADD CONSTRAINT "share_link_organizationId_fkey"
      FOREIGN KEY ("organizationId") REFERENCES "organization"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                 WHERE conname = 'share_link_createdByUserId_fkey') THEN
    ALTER TABLE "share_link"
      ADD CONSTRAINT "share_link_createdByUserId_fkey"
      FOREIGN KEY ("createdByUserId") REFERENCES "user"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- === 20260808014800_comments ===============================================
CREATE TABLE IF NOT EXISTS "comment" (
    "id"               TEXT      NOT NULL,
    "organizationId"   TEXT      NOT NULL,
    "entityType"       TEXT      NOT NULL,
    "entityId"         TEXT      NOT NULL,
    "authorUserId"     TEXT      NOT NULL,
    "body"             TEXT      NOT NULL,
    "mentionedUserIds" TEXT[]    NOT NULL DEFAULT ARRAY[]::TEXT[],
    "parentId"         TEXT,
    "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"        TIMESTAMP(3) NOT NULL,
    "deletedAt"        TIMESTAMP(3),
    CONSTRAINT "comment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "comment_organizationId_entityType_entityId_createdAt_idx"
    ON "comment"("organizationId", "entityType", "entityId", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                 WHERE conname = 'comment_organizationId_fkey') THEN
    ALTER TABLE "comment"
      ADD CONSTRAINT "comment_organizationId_fkey"
      FOREIGN KEY ("organizationId") REFERENCES "organization"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                 WHERE conname = 'comment_authorUserId_fkey') THEN
    ALTER TABLE "comment"
      ADD CONSTRAINT "comment_authorUserId_fkey"
      FOREIGN KEY ("authorUserId") REFERENCES "user"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                 WHERE conname = 'comment_parentId_fkey') THEN
    ALTER TABLE "comment"
      ADD CONSTRAINT "comment_parentId_fkey"
      FOREIGN KEY ("parentId") REFERENCES "comment"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- === 20260808014900_floor_plan_areas =======================================
CREATE TABLE IF NOT EXISTS "floor_plan_area" (
    "id"             TEXT      NOT NULL,
    "organizationId" TEXT      NOT NULL,
    "floorId"        TEXT      NOT NULL,
    "unitId"         TEXT      NOT NULL,
    "polygon"        JSONB     NOT NULL,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3) NOT NULL,
    CONSTRAINT "floor_plan_area_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "floor_plan_area_organizationId_floorId_idx"
    ON "floor_plan_area"("organizationId", "floorId");
CREATE INDEX IF NOT EXISTS "floor_plan_area_unitId_idx"
    ON "floor_plan_area"("unitId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                 WHERE conname = 'floor_plan_area_organizationId_fkey') THEN
    ALTER TABLE "floor_plan_area"
      ADD CONSTRAINT "floor_plan_area_organizationId_fkey"
      FOREIGN KEY ("organizationId") REFERENCES "organization"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                 WHERE conname = 'floor_plan_area_floorId_fkey') THEN
    ALTER TABLE "floor_plan_area"
      ADD CONSTRAINT "floor_plan_area_floorId_fkey"
      FOREIGN KEY ("floorId") REFERENCES "floor"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                 WHERE conname = 'floor_plan_area_unitId_fkey') THEN
    ALTER TABLE "floor_plan_area"
      ADD CONSTRAINT "floor_plan_area_unitId_fkey"
      FOREIGN KEY ("unitId") REFERENCES "unit"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- === smoke tests ===========================================================
SELECT 'document.sortOrder' AS check,
       EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'document' AND column_name = 'sortOrder') AS ok
UNION ALL
SELECT 'document.isCover',
       EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'document' AND column_name = 'isCover')
UNION ALL
SELECT 'organization_profile.onboardingCompletedAt',
       EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'organization_profile'
                 AND column_name = 'onboardingCompletedAt')
UNION ALL
SELECT 'share_link (table)',
       EXISTS (SELECT 1 FROM information_schema.tables
               WHERE table_name = 'share_link')
UNION ALL
SELECT 'comment (table)',
       EXISTS (SELECT 1 FROM information_schema.tables
               WHERE table_name = 'comment')
UNION ALL
SELECT 'floor_plan_area (table)',
       EXISTS (SELECT 1 FROM information_schema.tables
               WHERE table_name = 'floor_plan_area');
