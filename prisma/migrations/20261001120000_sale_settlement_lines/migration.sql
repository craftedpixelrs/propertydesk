-- Final settlement lines on a fully paid sale. Deductions and
-- surcharges adjust the handover total; Sale.finalPrice stays put.

CREATE TYPE "SaleSettlementLineKind" AS ENUM ('DEDUCTION', 'SURCHARGE');

CREATE TABLE "sale_settlement_line" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "kind" "SaleSettlementLineKind" NOT NULL,
    "presetCode" TEXT,
    "label" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "note" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sale_settlement_line_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "sale_settlement_line_saleId_createdAt_idx" ON "sale_settlement_line"("saleId", "createdAt");

ALTER TABLE "sale_settlement_line" ADD CONSTRAINT "sale_settlement_line_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sale_settlement_line" ADD CONSTRAINT "sale_settlement_line_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "sale"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sale_settlement_line" ADD CONSTRAINT "sale_settlement_line_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
