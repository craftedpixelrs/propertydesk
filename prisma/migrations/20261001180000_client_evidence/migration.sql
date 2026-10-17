-- Handover checklist, buyer email log, org message templates, task source key.

ALTER TABLE "task" ADD COLUMN "sourceKey" TEXT;

CREATE UNIQUE INDEX "task_organizationId_sourceKey_key" ON "task"("organizationId", "sourceKey");

CREATE TABLE "sale_handover" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "keysHanded" BOOLEAN NOT NULL DEFAULT false,
    "meterElectricity" TEXT,
    "meterWater" TEXT,
    "meterHeating" TEXT,
    "defects" TEXT,
    "attendees" TEXT,
    "completedAt" TIMESTAMP(3),
    "completedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sale_handover_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "sale_handover_saleId_key" ON "sale_handover"("saleId");

CREATE TABLE "buyer_notice" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "buyer_notice_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "buyer_notice_kind_entityId_key" ON "buyer_notice"("kind", "entityId");
CREATE INDEX "buyer_notice_organizationId_buyerId_idx" ON "buyer_notice"("organizationId", "buyerId");

CREATE TABLE "org_message_template" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "org_message_template_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "org_message_template_organizationId_key_key" ON "org_message_template"("organizationId", "key");

ALTER TABLE "sale_handover" ADD CONSTRAINT "sale_handover_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sale_handover" ADD CONSTRAINT "sale_handover_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "sale"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sale_handover" ADD CONSTRAINT "sale_handover_completedByUserId_fkey" FOREIGN KEY ("completedByUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "buyer_notice" ADD CONSTRAINT "buyer_notice_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "buyer_notice" ADD CONSTRAINT "buyer_notice_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "buyer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "org_message_template" ADD CONSTRAINT "org_message_template_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
