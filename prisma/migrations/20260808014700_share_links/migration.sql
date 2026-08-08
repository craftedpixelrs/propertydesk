-- Creates a table for opaque public-share tokens used by
-- `/p/[token]` unit offer pages. Every column is filled at insert
-- time except `expiresAt` (optional TTL) and the counters, which grow
-- as public viewers hit the page.
--
-- Token uniqueness is enforced by index; token generation uses
-- `crypto.randomBytes(24).toString("base64url")` (~192 bits of
-- entropy) so URL guessing is not feasible.
--
-- We do not add a FK from `entityId` to `unit`/`project` because the
-- table is intentionally polymorphic — the `entityType` discriminator
-- decides which table to look up. The service layer enforces
-- integrity: an operator cannot create a link for a unit they don't
-- own or cannot see.
CREATE TABLE "share_link" (
    "id"              TEXT      NOT NULL,
    "organizationId"  TEXT      NOT NULL,
    "entityType"      TEXT      NOT NULL,
    "entityId"        TEXT      NOT NULL,
    "token"           TEXT      NOT NULL,
    "createdByUserId" TEXT      NOT NULL,
    "showPrice"       BOOLEAN   NOT NULL DEFAULT TRUE,
    "expiresAt"       TIMESTAMP(3),
    "revokedAt"       TIMESTAMP(3),
    "viewCount"       INTEGER   NOT NULL DEFAULT 0,
    "lastViewedAt"    TIMESTAMP(3),
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "share_link_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "share_link_token_key" ON "share_link"("token");
CREATE INDEX "share_link_organizationId_entityType_entityId_idx"
    ON "share_link"("organizationId", "entityType", "entityId");

ALTER TABLE "share_link"
    ADD CONSTRAINT "share_link_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organization"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "share_link"
    ADD CONSTRAINT "share_link_createdByUserId_fkey"
    FOREIGN KEY ("createdByUserId") REFERENCES "user"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
