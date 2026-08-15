-- Property Desk — Sloj C levels + bogatiji lead
--
-- Uvodimo `level` (Sourcing/Closing/Operations/Archived) kao nadgrupu iznad
-- `stage`. Level je ono što određuje ko lead vidi (Setter → SOURCING, Closer
-- → CLOSING, Operations → OPERATIONS, MANAGER/SUPER_ADMIN → sve). Uz level
-- dolazi bogatija klasifikacija (priority/temperature/timeline/leadScore),
-- kompanija, kontakt/decision-maker, geo i deterministički lead-score.
--
-- Backfill logika za postojeće redove:
--   NEW/CONTACTED/QUALIFIED/NURTURING → SOURCING
--   DEMO/PROPOSAL                     → CLOSING
--   WON                               → OPERATIONS
--   LOST                              → ARCHIVED

-- CreateEnum
CREATE TYPE "MarketingLeadLevel" AS ENUM (
  'SOURCING',
  'CLOSING',
  'OPERATIONS',
  'ARCHIVED'
);

CREATE TYPE "LeadPriority" AS ENUM (
  'LOW',
  'NORMAL',
  'HIGH',
  'URGENT'
);

CREATE TYPE "LeadTemperature" AS ENUM (
  'COLD',
  'WARM',
  'HOT'
);

CREATE TYPE "LeadBudgetTier" AS ENUM (
  'STARTER',
  'GROWTH',
  'ENTERPRISE',
  'UNKNOWN'
);

CREATE TYPE "LeadTimeline" AS ENUM (
  'WITHIN_30D',
  'WITHIN_90D',
  'LATER',
  'UNDECIDED'
);

CREATE TYPE "LeadContactChannel" AS ENUM (
  'PHONE',
  'EMAIL',
  'WHATSAPP',
  'VIBER',
  'OTHER'
);

-- AlterTable: dopune na marketing_lead
ALTER TABLE "marketing_lead"
  ADD COLUMN "level"             "MarketingLeadLevel" NOT NULL DEFAULT 'SOURCING',
  ADD COLUMN "previousLevel"     "MarketingLeadLevel",
  ADD COLUMN "levelEnteredAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "priority"          "LeadPriority" NOT NULL DEFAULT 'NORMAL',
  ADD COLUMN "temperature"       "LeadTemperature" NOT NULL DEFAULT 'COLD',
  ADD COLUMN "timelineHorizon"   "LeadTimeline" NOT NULL DEFAULT 'UNDECIDED',
  ADD COLUMN "nextFollowUpAt"    TIMESTAMP(3),
  ADD COLUMN "leadScore"         INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "companyName"       TEXT,
  ADD COLUMN "companyWebsite"    TEXT,
  ADD COLUMN "companySize"       INTEGER,
  ADD COLUMN "budgetTier"        "LeadBudgetTier" NOT NULL DEFAULT 'UNKNOWN',
  ADD COLUMN "budgetCurrency"    TEXT DEFAULT 'EUR',
  ADD COLUMN "decisionMakerName" TEXT,
  ADD COLUMN "decisionMakerTitle" TEXT,
  ADD COLUMN "preferredContact"  "LeadContactChannel",
  ADD COLUMN "bestContactHour"   TEXT,
  ADD COLUMN "preferredLanguage" TEXT DEFAULT 'sr',
  ADD COLUMN "competitor"        TEXT,
  ADD COLUMN "painPoint"         TEXT,
  ADD COLUMN "country"           TEXT DEFAULT 'RS',
  ADD COLUMN "region"            TEXT;

-- Backfill level iz postojećeg stage-a (previousLevel i levelEnteredAt ostaju default-ovani).
UPDATE "marketing_lead"
SET "level" = CASE "stage"
  WHEN 'NEW'        THEN 'SOURCING'::"MarketingLeadLevel"
  WHEN 'CONTACTED'  THEN 'SOURCING'::"MarketingLeadLevel"
  WHEN 'QUALIFIED'  THEN 'SOURCING'::"MarketingLeadLevel"
  WHEN 'NURTURING'  THEN 'SOURCING'::"MarketingLeadLevel"
  WHEN 'DEMO'       THEN 'CLOSING'::"MarketingLeadLevel"
  WHEN 'PROPOSAL'   THEN 'CLOSING'::"MarketingLeadLevel"
  WHEN 'WON'        THEN 'OPERATIONS'::"MarketingLeadLevel"
  WHEN 'LOST'       THEN 'ARCHIVED'::"MarketingLeadLevel"
  ELSE 'SOURCING'::"MarketingLeadLevel"
END,
    "levelEnteredAt" = COALESCE("updatedAt", "createdAt", CURRENT_TIMESTAMP);

-- CreateIndex
CREATE INDEX "marketing_lead_level_priority_idx"
  ON "marketing_lead"("level", "priority");
CREATE INDEX "marketing_lead_nextFollowUpAt_idx"
  ON "marketing_lead"("nextFollowUpAt");
CREATE INDEX "marketing_lead_leadScore_idx"
  ON "marketing_lead"("leadScore" DESC);
