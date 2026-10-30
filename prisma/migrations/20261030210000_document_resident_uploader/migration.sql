-- Faza 11 — resident portal document uploads.
-- 1. Drop the strict FK so residents (non-User rows) can own a document.
-- 2. Add `uploaded_by_person_id` so we can trace resident uploads.
-- 3. Soften both FKs to SET NULL so operator / resident deletions don't
--    cascade-restrict the document table.

ALTER TABLE "document" DROP CONSTRAINT IF EXISTS "document_uploadedByUserId_fkey";
ALTER TABLE "document" ALTER COLUMN "uploadedByUserId" DROP NOT NULL;
ALTER TABLE "document"
  ADD CONSTRAINT "document_uploadedByUserId_fkey"
  FOREIGN KEY ("uploadedByUserId") REFERENCES "user"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "document" ADD COLUMN IF NOT EXISTS "uploadedByPersonId" TEXT;
ALTER TABLE "document"
  ADD CONSTRAINT "document_uploadedByPersonId_fkey"
  FOREIGN KEY ("uploadedByPersonId") REFERENCES "building_person"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "document_uploadedByPersonId_idx"
  ON "document" ("uploadedByPersonId");
