-- Faza 11 — dedupe log for dues reminders.
-- One row per debtor email actually dispatched by `sendDuesReminders`.
-- A second call within `cooldownDays` for the same unit is skipped and
-- audited as `skipped`.

CREATE TABLE "dues_reminder_log" (
  "id"             TEXT        NOT NULL,
  "organizationId" TEXT        NOT NULL,
  "buildingId"     TEXT        NOT NULL,
  "unitId"         TEXT        NOT NULL,
  "recipientEmail" TEXT        NOT NULL,
  "outstanding"    DECIMAL(14,2) NOT NULL,
  "sentAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "dues_reminder_log_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "dues_reminder_log_organizationId_unitId_sentAt_idx"
  ON "dues_reminder_log" ("organizationId", "unitId", "sentAt");

CREATE INDEX "dues_reminder_log_organizationId_buildingId_sentAt_idx"
  ON "dues_reminder_log" ("organizationId", "buildingId", "sentAt");

ALTER TABLE "dues_reminder_log"
  ADD CONSTRAINT "dues_reminder_log_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
