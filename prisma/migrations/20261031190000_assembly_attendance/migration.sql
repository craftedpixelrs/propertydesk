-- Prisustvo na skupštini i sačuvan kvorum pri zatvaranju.
-- Kvorum je više od polovine zbirnog učešća posebnih delova.

CREATE TYPE "AssemblyPresenceMode" AS ENUM ('IN_PERSON', 'ELECTRONIC', 'PROXY');

ALTER TABLE "assembly"
  ADD COLUMN "presentShare" DECIMAL(14, 4),
  ADD COLUMN "quorumMet" BOOLEAN;

CREATE TABLE "assembly_attendance" (
  "id"               TEXT NOT NULL,
  "assemblyId"       TEXT NOT NULL,
  "unitId"           TEXT NOT NULL,
  "personId"         TEXT,
  "mode"             "AssemblyPresenceMode" NOT NULL DEFAULT 'IN_PERSON',
  "note"             TEXT,
  "recordedByUserId" TEXT,
  "recordedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "assembly_attendance_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "assembly_attendance_assemblyId_unitId_key"
  ON "assembly_attendance" ("assemblyId", "unitId");

CREATE INDEX "assembly_attendance_assemblyId_idx"
  ON "assembly_attendance" ("assemblyId");

ALTER TABLE "assembly_attendance"
  ADD CONSTRAINT "assembly_attendance_assemblyId_fkey"
  FOREIGN KEY ("assemblyId") REFERENCES "assembly"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "assembly_attendance"
  ADD CONSTRAINT "assembly_attendance_unitId_fkey"
  FOREIGN KEY ("unitId") REFERENCES "managed_unit"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
