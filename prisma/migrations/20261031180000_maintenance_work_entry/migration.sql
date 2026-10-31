-- Evidencija rada na prijavi kvara. Odvojeno od istorije statusa
-- da upravnik može da zabeleži šta je urađeno, a stanar vidi samo
-- stavke označene kao vidljive.

CREATE TABLE "maintenance_work_entry" (
  "id"                TEXT        NOT NULL,
  "organizationId"    TEXT        NOT NULL,
  "ticketId"          TEXT        NOT NULL,
  "body"              TEXT        NOT NULL,
  "visibleToResident" BOOLEAN     NOT NULL DEFAULT true,
  "createdByUserId"   TEXT,
  "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "maintenance_work_entry_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "maintenance_work_entry_ticketId_createdAt_idx"
  ON "maintenance_work_entry" ("ticketId", "createdAt");

ALTER TABLE "maintenance_work_entry"
  ADD CONSTRAINT "maintenance_work_entry_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "maintenance_work_entry"
  ADD CONSTRAINT "maintenance_work_entry_ticketId_fkey"
  FOREIGN KEY ("ticketId") REFERENCES "maintenance_ticket"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
