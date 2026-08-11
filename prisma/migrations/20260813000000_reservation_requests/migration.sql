-- Faza 8.1 (A2) — Online rezervacija sa kaparom.
--
-- A `PENDING` row locks the target unit ON_HOLD for `expiresAt`. When
-- the investor confirms the deposit the row transitions to `CONFIRMED`
-- and a real `Reservation` (with `agencyOrganizationId` from the
-- `referralCode` mapping) is materialised.
--
-- `ipsReference` is the generated Serbian poziv-na-broj; `ipsQrPngPath`
-- points into object storage where the pre-rendered IPS QR PNG lives.

CREATE TYPE "ReservationRequestStatus" AS ENUM ('PENDING', 'CONFIRMED', 'DECLINED', 'EXPIRED');

CREATE TABLE "reservation_request" (
    "id"              TEXT                       NOT NULL,
    "organizationId"  TEXT                       NOT NULL,
    "shareLinkId"     TEXT,
    "unitId"          TEXT                       NOT NULL,
    "firstName"       TEXT                       NOT NULL,
    "lastName"        TEXT                       NOT NULL,
    "email"           TEXT                       NOT NULL,
    "phone"           TEXT                       NOT NULL,
    "depositAmount"   DECIMAL(14, 2)             NOT NULL,
    "currency"        TEXT                       NOT NULL DEFAULT 'EUR',
    "ipsReference"    TEXT                       NOT NULL,
    "ipsQrPngPath"    TEXT,
    "status"          "ReservationRequestStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt"       TIMESTAMP(3)               NOT NULL,
    "referralCode"    TEXT,
    "notes"           TEXT,
    "decidedAt"       TIMESTAMP(3),
    "decidedByUserId" TEXT,
    "createdAt"       TIMESTAMP(3)               NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3)               NOT NULL,

    CONSTRAINT "reservation_request_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "reservation_request_organizationId_status_expiresAt_idx"
    ON "reservation_request"("organizationId", "status", "expiresAt");
CREATE INDEX "reservation_request_unitId_status_idx"
    ON "reservation_request"("unitId", "status");

-- Investor's IPS QR receiver account (18-digit Serbian domestic).
-- Optional — when unset, the public reservation flow degrades to a
-- plain reference number instead of a scannable QR PNG.
ALTER TABLE "organization_profile"
    ADD COLUMN "paymentAccountNumber" TEXT,
    ADD COLUMN "paymentBankName"      TEXT;

ALTER TABLE "reservation_request"
    ADD CONSTRAINT "reservation_request_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organization"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "reservation_request"
    ADD CONSTRAINT "reservation_request_shareLinkId_fkey"
    FOREIGN KEY ("shareLinkId") REFERENCES "share_link"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "reservation_request"
    ADD CONSTRAINT "reservation_request_unitId_fkey"
    FOREIGN KEY ("unitId") REFERENCES "unit"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "reservation_request"
    ADD CONSTRAINT "reservation_request_decidedByUserId_fkey"
    FOREIGN KEY ("decidedByUserId") REFERENCES "user"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
