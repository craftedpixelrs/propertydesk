-- Soft-deleted documents keep their object in storage for 45 days.
-- `purge-deleted-documents` sets this after a successful storage delete.
ALTER TABLE "document" ADD COLUMN "storagePurgedAt" TIMESTAMP(3);

CREATE INDEX "document_deletedAt_storagePurgedAt_idx" ON "document"("deletedAt", "storagePurgedAt");
