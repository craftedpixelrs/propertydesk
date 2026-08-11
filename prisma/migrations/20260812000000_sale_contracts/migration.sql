-- Faza 8.1 (A1) — Sale-contract generator.
--
-- Adds:
--   * `SaleContractKind` (PRE_CONTRACT | CONTRACT)
--   * `SaleContractStatus` (NONE | GENERATED | SENT | SIGNED | CANCELED)
--   * `sale_contract_template` (per-org reusable HTML blueprints)
--   * 4 columns on `sale` that track the current contract lifecycle
--
-- Everything is additive; `sale.contractStatus` defaults to `NONE` so
-- existing rows stay valid without a backfill.

CREATE TYPE "SaleContractKind" AS ENUM ('PRE_CONTRACT', 'CONTRACT');
CREATE TYPE "SaleContractStatus" AS ENUM ('NONE', 'GENERATED', 'SENT', 'SIGNED', 'CANCELED');

CREATE TABLE "sale_contract_template" (
    "id"             TEXT               NOT NULL,
    "organizationId" TEXT               NOT NULL,
    "kind"           "SaleContractKind" NOT NULL,
    "name"           TEXT               NOT NULL,
    "description"    TEXT,
    "contentHtml"    TEXT               NOT NULL,
    "variables"      JSONB,
    "isActive"       BOOLEAN            NOT NULL DEFAULT TRUE,
    "createdAt"      TIMESTAMP(3)       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3)       NOT NULL,

    CONSTRAINT "sale_contract_template_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "sale_contract_template_organizationId_kind_isActive_idx"
    ON "sale_contract_template"("organizationId", "kind", "isActive");

ALTER TABLE "sale_contract_template"
    ADD CONSTRAINT "sale_contract_template_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organization"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "sale"
    ADD COLUMN "contractStatus"     "SaleContractStatus" NOT NULL DEFAULT 'NONE',
    ADD COLUMN "contractSentAt"     TIMESTAMP(3),
    ADD COLUMN "contractSignedAt"   TIMESTAMP(3),
    ADD COLUMN "contractTemplateId" TEXT;
