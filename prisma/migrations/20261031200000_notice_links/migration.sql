-- Obaveštenje može da pokaže na skupštinu ili kvar.
-- originKey čuva jedan red po događaju (poziv, rezultat, otvaranje, zatvaranje).

ALTER TABLE "building_notice"
  ADD COLUMN "assemblyId" TEXT,
  ADD COLUMN "ticketId" TEXT,
  ADD COLUMN "originKey" TEXT;

CREATE UNIQUE INDEX "building_notice_organizationId_originKey_key"
  ON "building_notice" ("organizationId", "originKey");

CREATE INDEX "building_notice_assemblyId_idx" ON "building_notice" ("assemblyId");
CREATE INDEX "building_notice_ticketId_idx" ON "building_notice" ("ticketId");

ALTER TABLE "building_notice"
  ADD CONSTRAINT "building_notice_assemblyId_fkey"
  FOREIGN KEY ("assemblyId") REFERENCES "assembly"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "building_notice"
  ADD CONSTRAINT "building_notice_ticketId_fkey"
  FOREIGN KEY ("ticketId") REFERENCES "maintenance_ticket"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
