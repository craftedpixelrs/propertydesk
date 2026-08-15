-- Property Desk CRM extension: MarketingLeadActivity + MarketingLeadTask.
--
-- Ove dve tabele daju Property Desk internom timu pravi CRM iznad postojećeg
-- `marketing_lead` reda: timeline aktivnosti (poziv/mejl/sastanak/beleška plus
-- automatski SYSTEM redovi za stage/assign/conversion) i follow-up taskove sa
-- dueAt / completedAt uparivanjem sa članom tima.

-- CreateEnum
CREATE TYPE "MarketingLeadActivityKind" AS ENUM (
  'CALL',
  'EMAIL',
  'MEETING',
  'NOTE',
  'STAGE_CHANGE',
  'ASSIGNMENT',
  'CONVERSION',
  'SYSTEM'
);

-- CreateTable
CREATE TABLE "marketing_lead_activity" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "kind" "MarketingLeadActivityKind" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "actorUserId" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "marketing_lead_activity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "marketing_lead_activity_leadId_occurredAt_idx"
  ON "marketing_lead_activity"("leadId", "occurredAt" DESC);
CREATE INDEX "marketing_lead_activity_kind_idx"
  ON "marketing_lead_activity"("kind");
CREATE INDEX "marketing_lead_activity_actorUserId_idx"
  ON "marketing_lead_activity"("actorUserId");

-- AddForeignKey
ALTER TABLE "marketing_lead_activity"
  ADD CONSTRAINT "marketing_lead_activity_leadId_fkey"
  FOREIGN KEY ("leadId") REFERENCES "marketing_lead"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "marketing_lead_activity"
  ADD CONSTRAINT "marketing_lead_activity_actorUserId_fkey"
  FOREIGN KEY ("actorUserId") REFERENCES "user"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "marketing_lead_task" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "dueAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "assignedToUserId" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "completedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marketing_lead_task_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "marketing_lead_task_leadId_idx"
  ON "marketing_lead_task"("leadId");
CREATE INDEX "marketing_lead_task_assignedToUserId_completedAt_idx"
  ON "marketing_lead_task"("assignedToUserId", "completedAt");
CREATE INDEX "marketing_lead_task_dueAt_idx"
  ON "marketing_lead_task"("dueAt");

-- AddForeignKey
ALTER TABLE "marketing_lead_task"
  ADD CONSTRAINT "marketing_lead_task_leadId_fkey"
  FOREIGN KEY ("leadId") REFERENCES "marketing_lead"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "marketing_lead_task"
  ADD CONSTRAINT "marketing_lead_task_assignedToUserId_fkey"
  FOREIGN KEY ("assignedToUserId") REFERENCES "user"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "marketing_lead_task"
  ADD CONSTRAINT "marketing_lead_task_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "user"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "marketing_lead_task"
  ADD CONSTRAINT "marketing_lead_task_completedByUserId_fkey"
  FOREIGN KEY ("completedByUserId") REFERENCES "user"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
