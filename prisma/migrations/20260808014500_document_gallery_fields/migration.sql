-- Adds ordering and cover-image support to the polymorphic `Document`
-- table so /jedinice/[id] and /projekti/[id] galleries can render a
-- predictable sequence of photos with one designated hero image per
-- entity.
--
-- `sortOrder` follows the same convention as `Building.sortOrder` and
-- `Unit.sortOrder` — lower is earlier; NULLs are never permitted, and
-- new uploads default to 0 (they land at the head until the operator
-- reorders explicitly).
--
-- `isCover` is enforced at most-once per (entityType, entityId) by the
-- documents.service in the app layer. We do NOT add a partial unique
-- index here on purpose — cover flipping across a batch would require
-- two statements in one transaction and Postgres does not permit
-- deferring unique constraints on partial indexes without extra setup.
ALTER TABLE "document"
  ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "isCover"   BOOLEAN NOT NULL DEFAULT FALSE;
