-- Threaded comments with @mentions on domain entities.
--
-- Polymorphic: `entityType` is currently either "Buyer" or "Sale". The
-- service layer decides which entities are commentable. `mentionedUserIds`
-- is the parsed set of `@handle` mentions from the body — kept as an
-- array column so the row is self-contained (no join table) and so the
-- notification pipeline can send fan-outs without re-parsing the body.
--
-- `deletedAt` implements soft-delete so an audit trail is preserved.
CREATE TABLE "comment" (
    "id"               TEXT      NOT NULL,
    "organizationId"   TEXT      NOT NULL,
    "entityType"       TEXT      NOT NULL,
    "entityId"         TEXT      NOT NULL,
    "authorUserId"     TEXT      NOT NULL,
    "body"             TEXT      NOT NULL,
    "mentionedUserIds" TEXT[]    NOT NULL DEFAULT ARRAY[]::TEXT[],
    "parentId"         TEXT,
    "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"        TIMESTAMP(3) NOT NULL,
    "deletedAt"        TIMESTAMP(3),

    CONSTRAINT "comment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "comment_organizationId_entityType_entityId_createdAt_idx"
    ON "comment"("organizationId", "entityType", "entityId", "createdAt");

ALTER TABLE "comment"
    ADD CONSTRAINT "comment_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organization"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "comment"
    ADD CONSTRAINT "comment_authorUserId_fkey"
    FOREIGN KEY ("authorUserId") REFERENCES "user"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "comment"
    ADD CONSTRAINT "comment_parentId_fkey"
    FOREIGN KEY ("parentId") REFERENCES "comment"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
