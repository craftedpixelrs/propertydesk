-- Agency network catalog (first marketplace slice):
--   * organization_profile verification (self-reg starts PENDING)
--   * project.networkCatalogEnabled (teaser opt-in, not full inventory)
--   * agency_connection_request (agency → investor; invite flow untouched)

CREATE TYPE "OrganizationVerificationStatus" AS ENUM (
  'UNVERIFIED',
  'PENDING',
  'VERIFIED',
  'REJECTED'
);

CREATE TYPE "AgencyConnectionRequestStatus" AS ENUM (
  'PENDING',
  'ACCEPTED',
  'REJECTED',
  'CANCELED'
);

ALTER TABLE "organization_profile"
  ADD COLUMN "verificationStatus" "OrganizationVerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
  ADD COLUMN "verifiedAt" TIMESTAMP(3),
  ADD COLUMN "verifiedByUserId" TEXT,
  ADD COLUMN "verificationNote" TEXT;

ALTER TABLE "organization_profile"
  ADD CONSTRAINT "organization_profile_verifiedByUserId_fkey"
  FOREIGN KEY ("verifiedByUserId") REFERENCES "user"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "organization_profile_verificationStatus_idx"
  ON "organization_profile"("verificationStatus");

-- Existing agencies only exist via investor invite or platform admin.
UPDATE "organization_profile"
SET
  "verificationStatus" = 'VERIFIED',
  "verifiedAt" = COALESCE("verifiedAt", CURRENT_TIMESTAMP)
WHERE "type" = 'AGENCY';

ALTER TABLE "project"
  ADD COLUMN "networkCatalogEnabled" BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE "agency_connection_request" (
  "id" TEXT NOT NULL,
  "agencyOrganizationId" TEXT NOT NULL,
  "investorOrganizationId" TEXT NOT NULL,
  "projectId" TEXT,
  "message" TEXT,
  "status" "AgencyConnectionRequestStatus" NOT NULL DEFAULT 'PENDING',
  "createdByUserId" TEXT NOT NULL,
  "reviewedByUserId" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "rejectionReason" TEXT,
  "resultingConnectionId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "agency_connection_request_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "agency_connection_request_pending_uniq"
  ON "agency_connection_request"("agencyOrganizationId", "investorOrganizationId")
  WHERE "status" = 'PENDING';

CREATE INDEX "agency_connection_request_investorOrganizationId_status_idx"
  ON "agency_connection_request"("investorOrganizationId", "status");

CREATE INDEX "agency_connection_request_agencyOrganizationId_status_idx"
  ON "agency_connection_request"("agencyOrganizationId", "status");

CREATE INDEX "agency_connection_request_projectId_idx"
  ON "agency_connection_request"("projectId");

ALTER TABLE "agency_connection_request"
  ADD CONSTRAINT "agency_connection_request_agencyOrganizationId_fkey"
  FOREIGN KEY ("agencyOrganizationId") REFERENCES "organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "agency_connection_request"
  ADD CONSTRAINT "agency_connection_request_investorOrganizationId_fkey"
  FOREIGN KEY ("investorOrganizationId") REFERENCES "organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "agency_connection_request"
  ADD CONSTRAINT "agency_connection_request_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "project"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "agency_connection_request"
  ADD CONSTRAINT "agency_connection_request_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "user"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "agency_connection_request"
  ADD CONSTRAINT "agency_connection_request_reviewedByUserId_fkey"
  FOREIGN KEY ("reviewedByUserId") REFERENCES "user"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "agency_connection_request"
  ADD CONSTRAINT "agency_connection_request_resultingConnectionId_fkey"
  FOREIGN KEY ("resultingConnectionId") REFERENCES "agency_connection"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
