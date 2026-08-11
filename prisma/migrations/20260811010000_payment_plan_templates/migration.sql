-- Reusable installment blueprints for investor payment plans.
--
-- Scope precedence:
--   * `projectId = NULL`  → organization-wide default
--   * `projectId <> NULL` → project-specific override
--
-- A template's items must sum to exactly 100% (enforced in the
-- service layer; no DB-level SUM constraint because Postgres check
-- constraints cannot span multiple rows). Applying a template
-- materialises PaymentInstallment rows on a Sale — the template
-- itself is never referenced by FK from PaymentPlan so historical
-- plans do not shift when the operator edits the template later.
CREATE TYPE "DueDateAnchor" AS ENUM ('CONTRACT', 'HANDOVER', 'CUSTOM_OFFSET');

CREATE TABLE "payment_plan_template" (
    "id"             TEXT      NOT NULL,
    "organizationId" TEXT      NOT NULL,
    "projectId"      TEXT,
    "name"           TEXT      NOT NULL,
    "description"    TEXT,
    "isDefault"      BOOLEAN   NOT NULL DEFAULT FALSE,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_plan_template_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "payment_plan_template_organizationId_projectId_idx"
    ON "payment_plan_template"("organizationId", "projectId");

ALTER TABLE "payment_plan_template"
    ADD CONSTRAINT "payment_plan_template_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organization"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "payment_plan_template"
    ADD CONSTRAINT "payment_plan_template_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "project"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "payment_plan_template_item" (
    "id"             TEXT           NOT NULL,
    "templateId"     TEXT           NOT NULL,
    "sequenceNumber" INTEGER        NOT NULL,
    "label"          TEXT           NOT NULL,
    "percentage"     DECIMAL(6, 3)  NOT NULL,
    "dueDateAnchor"  "DueDateAnchor" NOT NULL DEFAULT 'CONTRACT',
    "offsetDays"     INTEGER        NOT NULL DEFAULT 0,
    "createdAt"      TIMESTAMP(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3)   NOT NULL,

    CONSTRAINT "payment_plan_template_item_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "payment_plan_template_item_templateId_sequenceNumber_key"
    ON "payment_plan_template_item"("templateId", "sequenceNumber");

ALTER TABLE "payment_plan_template_item"
    ADD CONSTRAINT "payment_plan_template_item_templateId_fkey"
    FOREIGN KEY ("templateId") REFERENCES "payment_plan_template"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
