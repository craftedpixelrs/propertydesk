-- Property Desk internal team + persistent marketing leads (Faza 2).
-- Additive migration: no existing tables are altered, no data is destroyed.

-- CreateEnum
CREATE TYPE "PropertyDeskTeamRole" AS ENUM ('SETTER', 'CLOSER', 'OPERATIONS', 'MANAGER');

-- CreateEnum
CREATE TYPE "PropertyDeskLeadScope" AS ENUM ('OWN', 'OWN_AND_UNASSIGNED', 'TEAM', 'ALL');

-- CreateEnum
CREATE TYPE "MarketingLeadStage" AS ENUM ('NEW', 'CONTACTED', 'QUALIFIED', 'DEMO', 'PROPOSAL', 'WON', 'LOST', 'NURTURING');

-- CreateEnum
CREATE TYPE "MarketingLeadAudience" AS ENUM ('INVESTOR', 'AGENCY', 'OTHER');

-- CreateTable
CREATE TABLE "property_desk_team_member" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "teamRole" "PropertyDeskTeamRole" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "leadScope" "PropertyDeskLeadScope" NOT NULL DEFAULT 'OWN_AND_UNASSIGNED',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdByUserId" TEXT,

    CONSTRAINT "property_desk_team_member_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "property_desk_team_member_userId_key" ON "property_desk_team_member"("userId");

-- CreateIndex
CREATE INDEX "property_desk_team_member_teamRole_idx" ON "property_desk_team_member"("teamRole");

-- CreateIndex
CREATE INDEX "property_desk_team_member_enabled_idx" ON "property_desk_team_member"("enabled");

-- AddForeignKey
ALTER TABLE "property_desk_team_member"
    ADD CONSTRAINT "property_desk_team_member_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_desk_team_member"
    ADD CONSTRAINT "property_desk_team_member_createdByUserId_fkey"
    FOREIGN KEY ("createdByUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "marketing_lead" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "phone" TEXT,
    "audience" "MarketingLeadAudience" NOT NULL DEFAULT 'OTHER',
    "city" TEXT,
    "projectCount" INTEGER,
    "note" TEXT,
    "source" TEXT,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "utmTerm" TEXT,
    "utmContent" TEXT,
    "consent" BOOLEAN NOT NULL DEFAULT false,
    "stage" "MarketingLeadStage" NOT NULL DEFAULT 'NEW',
    "assignedToUserId" TEXT,
    "convertedOrganizationId" TEXT,
    "convertedAt" TIMESTAMP(3),
    "lostReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marketing_lead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "marketing_lead_email_key" ON "marketing_lead"("email");

-- CreateIndex
CREATE INDEX "marketing_lead_stage_idx" ON "marketing_lead"("stage");

-- CreateIndex
CREATE INDEX "marketing_lead_assignedToUserId_idx" ON "marketing_lead"("assignedToUserId");

-- CreateIndex
CREATE INDEX "marketing_lead_createdAt_idx" ON "marketing_lead"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "marketing_lead_audience_idx" ON "marketing_lead"("audience");

-- AddForeignKey
ALTER TABLE "marketing_lead"
    ADD CONSTRAINT "marketing_lead_assignedToUserId_fkey"
    FOREIGN KEY ("assignedToUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketing_lead"
    ADD CONSTRAINT "marketing_lead_convertedOrganizationId_fkey"
    FOREIGN KEY ("convertedOrganizationId") REFERENCES "organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
