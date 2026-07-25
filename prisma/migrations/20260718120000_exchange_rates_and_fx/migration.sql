-- CreateEnum
CREATE TYPE "ExchangeRateSource" AS ENUM ('MANUAL', 'NBS');

-- AlterTable: GlobalBillingSettings
ALTER TABLE "global_billing_settings"
    ADD COLUMN "defaultInvoiceInRsd" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable: OrganizationBillingSettings
ALTER TABLE "organization_billing_settings"
    ADD COLUMN "invoiceInRsd" BOOLEAN;

-- AlterTable: Invoice — FX snapshot columns
ALTER TABLE "invoice"
    ADD COLUMN "baseCurrency" TEXT,
    ADD COLUMN "baseSubtotal" DECIMAL(14, 2),
    ADD COLUMN "baseTaxAmount" DECIMAL(14, 2),
    ADD COLUMN "baseTotalAmount" DECIMAL(14, 2),
    ADD COLUMN "fxRate" DECIMAL(18, 6),
    ADD COLUMN "fxRateDate" DATE;

-- CreateTable
CREATE TABLE "exchange_rate" (
    "id" TEXT NOT NULL,
    "baseCurrency" TEXT NOT NULL DEFAULT 'EUR',
    "quoteCurrency" TEXT NOT NULL DEFAULT 'RSD',
    "rate" DECIMAL(18, 6) NOT NULL,
    "effectiveDate" DATE NOT NULL,
    "source" "ExchangeRateSource" NOT NULL DEFAULT 'MANUAL',
    "note" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exchange_rate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "exchange_rate_baseCurrency_quoteCurrency_effectiveDate_key"
    ON "exchange_rate"("baseCurrency", "quoteCurrency", "effectiveDate");

-- CreateIndex
CREATE INDEX "exchange_rate_baseCurrency_quoteCurrency_effectiveDate_idx"
    ON "exchange_rate"("baseCurrency", "quoteCurrency", "effectiveDate");
