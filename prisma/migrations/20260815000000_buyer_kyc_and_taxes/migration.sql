-- Faza 8.2 (B1 + B2) — KYC modul za kupce + VAT/RPI mode na Sale.
--
-- B1: extends Buyer with legal-entity + address + Serbian ID fields
--     and introduces `buyer_kyc_checklist` (1:1 with buyer). Adds a
--     new `DocumentCategory.KYC` enum value so KYC documents can be
--     filed under the polymorphic `Document` model without polluting
--     the BUYER / SALE categories.
-- B2: adds vatMode / taxAmount / taxPayer to Sale. Values are
--     optional — existing sales stay valid.

CREATE TYPE "BuyerEntityType" AS ENUM ('NATURAL', 'LEGAL');
CREATE TYPE "SaleVatMode"     AS ENUM ('NEW_BUILD_10', 'SECONDARY_MARKET_2_5', 'NONE');
CREATE TYPE "SaleTaxPayer"    AS ENUM ('BUYER', 'SELLER');

-- Extend the existing DocumentCategory enum with a new value.
ALTER TYPE "DocumentCategory" ADD VALUE 'KYC';

-- Buyer — legal-entity / KYC / address columns.
ALTER TABLE "buyer"
    ADD COLUMN "jmbg"           TEXT,
    ADD COLUMN "identityNumber" TEXT,
    ADD COLUMN "taxId"          TEXT,
    ADD COLUMN "entityType"     "BuyerEntityType" NOT NULL DEFAULT 'NATURAL',
    ADD COLUMN "legalName"      TEXT,
    ADD COLUMN "addressLine1"   TEXT,
    ADD COLUMN "city"           TEXT,
    ADD COLUMN "postalCode"     TEXT,
    ADD COLUMN "country"        TEXT;

CREATE TABLE "buyer_kyc_checklist" (
    "id"               TEXT         NOT NULL,
    "buyerId"          TEXT         NOT NULL,
    "idFrontOk"        BOOLEAN      NOT NULL DEFAULT FALSE,
    "idBackOk"         BOOLEAN      NOT NULL DEFAULT FALSE,
    "addressProofOk"   BOOLEAN      NOT NULL DEFAULT FALSE,
    "taxCertOk"        BOOLEAN      NOT NULL DEFAULT FALSE,
    "reviewedByUserId" TEXT,
    "reviewedAt"       TIMESTAMP(3),
    "notes"            TEXT,
    "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"        TIMESTAMP(3) NOT NULL,

    CONSTRAINT "buyer_kyc_checklist_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "buyer_kyc_checklist_buyerId_key"
    ON "buyer_kyc_checklist"("buyerId");

ALTER TABLE "buyer_kyc_checklist"
    ADD CONSTRAINT "buyer_kyc_checklist_buyerId_fkey"
    FOREIGN KEY ("buyerId") REFERENCES "buyer"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "buyer_kyc_checklist"
    ADD CONSTRAINT "buyer_kyc_checklist_reviewedByUserId_fkey"
    FOREIGN KEY ("reviewedByUserId") REFERENCES "user"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- Sale — B2 tax columns.
ALTER TABLE "sale"
    ADD COLUMN "vatMode"   "SaleVatMode",
    ADD COLUMN "taxAmount" DECIMAL(14, 2),
    ADD COLUMN "taxPayer"  "SaleTaxPayer" NOT NULL DEFAULT 'BUYER';
