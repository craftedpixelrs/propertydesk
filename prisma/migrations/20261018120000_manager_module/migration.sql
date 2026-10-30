-- Faza 11 — Upravnici zgrada (building managers)
-- Novi tip organizacije (MANAGER), zasebne pretplate i kompletan modul
-- za vođenje stambenih zajednica (zgrade, posebni delovi, vlasnici,
-- zaduženja/uplate, kvarovi, troškovi, skupštine, obaveštenja, portal
-- za stanare i prenos zgrade od investitora).
--
-- Sve je aditivno. Nijedan postojeći red se ne menja.

-- ----------------------------------------------------------------------------
-- 1) Enum-ovi
-- ----------------------------------------------------------------------------

ALTER TYPE "OrganizationType" ADD VALUE 'MANAGER';
ALTER TYPE "MarketingLeadAudience" ADD VALUE 'MANAGER';

ALTER TYPE "DocumentCategory" ADD VALUE 'BUILDING';
ALTER TYPE "DocumentCategory" ADD VALUE 'TICKET';
ALTER TYPE "DocumentCategory" ADD VALUE 'ASSEMBLY';
ALTER TYPE "DocumentCategory" ADD VALUE 'DUES';

ALTER TYPE "NotificationCategory" ADD VALUE 'BUILDING';
ALTER TYPE "NotificationCategory" ADD VALUE 'TICKET';
ALTER TYPE "NotificationCategory" ADD VALUE 'ASSEMBLY';
ALTER TYPE "NotificationCategory" ADD VALUE 'DUES';
ALTER TYPE "NotificationCategory" ADD VALUE 'NOTICE';

CREATE TYPE "ManagedUnitType" AS ENUM ('APARTMENT','COMMERCIAL','GARAGE','PARKING_SPACE','STORAGE','OFFICE','OTHER');
CREATE TYPE "ManagedPersonRole" AS ENUM ('OWNER','TENANT','USER');
CREATE TYPE "DuesTariffBasis" AS ENUM ('PER_UNIT','PER_SQUARE_METER');
CREATE TYPE "DuesTariffKind" AS ENUM ('CURRENT_MAINTENANCE','INVESTMENT_FUND','MANAGER_FEE','INSURANCE','OTHER');
CREATE TYPE "DuesChargeStatus" AS ENUM ('OPEN','PARTIALLY_PAID','PAID','WRITTEN_OFF');
CREATE TYPE "MaintenanceCategory" AS ENUM ('PLUMBING','ELECTRICAL','HEATING','ELEVATOR','COMMON_AREAS','ROOF','FACADE','SECURITY','CLEANING','OTHER');
CREATE TYPE "MaintenancePriority" AS ENUM ('LOW','NORMAL','HIGH','URGENT');
CREATE TYPE "MaintenanceStatus" AS ENUM ('OPEN','TRIAGED','IN_PROGRESS','AWAITING_PARTS','COMPLETED','CANCELED');
CREATE TYPE "BuildingExpenseFund" AS ENUM ('CURRENT_MAINTENANCE','INVESTMENT_FUND','OTHER');
CREATE TYPE "AssemblyType" AS ENUM ('REGULAR','EXTRAORDINARY','WRITTEN_PROCEDURE');
CREATE TYPE "AssemblyStatus" AS ENUM ('SCHEDULED','OPEN_FOR_VOTING','COMPLETED','CANCELED');
CREATE TYPE "AgendaItemVoteKind" AS ENUM ('DECISION','INFORMATION','ELECTION');
CREATE TYPE "AgendaItemMajority" AS ENUM ('SIMPLE','ABSOLUTE','TWO_THIRDS');
CREATE TYPE "AssemblyVoteChoice" AS ENUM ('YES','NO','ABSTAIN');
CREATE TYPE "BuildingNoticeChannel" AS ENUM ('PORTAL_ONLY','PORTAL_AND_EMAIL','EMAIL_ONLY');
CREATE TYPE "BuildingNoticeAudience" AS ENUM ('ALL','BY_ENTRANCE','BY_UNIT_TYPE','SPECIFIC_UNITS');
CREATE TYPE "BuildingHandoverStatus" AS ENUM ('PENDING','ACCEPTED','REJECTED','CANCELED');
CREATE TYPE "ResidentAccessStatus" AS ENUM ('PENDING_INVITE','ACTIVE','REVOKED');

-- ----------------------------------------------------------------------------
-- 2) SaaSPlan: audience + manager-specific limits
-- ----------------------------------------------------------------------------

ALTER TABLE "saas_plan" ADD COLUMN "audience" "OrganizationType";
ALTER TABLE "saas_plan" ADD COLUMN "maxManagedBuildings" INTEGER;
ALTER TABLE "saas_plan" ADD COLUMN "maxManagedUnits" INTEGER;
CREATE INDEX "saas_plan_audience_idx" ON "saas_plan"("audience");

-- ----------------------------------------------------------------------------
-- 3) ManagedBuilding — osnovna stambena zajednica
-- ----------------------------------------------------------------------------

CREATE TABLE "managed_building" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "municipality" TEXT,
    "postalCode" TEXT,
    "country" TEXT DEFAULT 'RS',
    "legalName" TEXT,
    "registrationNumber" TEXT,
    "taxNumber" TEXT,
    "paymentAccountNumber" TEXT,
    "paymentBankName" TEXT,
    "cadastralLot" TEXT,
    "cadastralMunicipality" TEXT,
    "entranceCount" INTEGER NOT NULL DEFAULT 1,
    "storeyCount" INTEGER,
    "sourceProjectId" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "notes" TEXT,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "managed_building_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "managed_building_organizationId_archivedAt_idx" ON "managed_building"("organizationId","archivedAt");
CREATE INDEX "managed_building_organizationId_city_idx" ON "managed_building"("organizationId","city");

ALTER TABLE "managed_building"
    ADD CONSTRAINT "managed_building_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "managed_building"
    ADD CONSTRAINT "managed_building_sourceProjectId_fkey"
    FOREIGN KEY ("sourceProjectId") REFERENCES "project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ----------------------------------------------------------------------------
-- 4) BuildingEntranceSection — ulazi (A, B, C ...)
-- ----------------------------------------------------------------------------

CREATE TABLE "building_entrance_section" (
    "id" TEXT NOT NULL,
    "buildingId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "building_entrance_section_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "building_entrance_section_buildingId_code_key" ON "building_entrance_section"("buildingId","code");

ALTER TABLE "building_entrance_section"
    ADD CONSTRAINT "building_entrance_section_buildingId_fkey"
    FOREIGN KEY ("buildingId") REFERENCES "managed_building"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ----------------------------------------------------------------------------
-- 5) ManagedUnit — posebni delovi (stanovi, poslovni, garaže ...)
-- ----------------------------------------------------------------------------

CREATE TABLE "managed_unit" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "buildingId" TEXT NOT NULL,
    "entranceId" TEXT,
    "code" TEXT NOT NULL,
    "type" "ManagedUnitType" NOT NULL DEFAULT 'APARTMENT',
    "floor" INTEGER,
    "totalArea" DECIMAL(10,2) NOT NULL,
    "participationShare" DECIMAL(10,4) NOT NULL DEFAULT 1,
    "roomCount" DECIMAL(4,1),
    "sourceUnitId" TEXT,
    "notes" TEXT,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "managed_unit_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "managed_unit_buildingId_code_key" ON "managed_unit"("buildingId","code");
CREATE INDEX "managed_unit_organizationId_archivedAt_idx" ON "managed_unit"("organizationId","archivedAt");

ALTER TABLE "managed_unit"
    ADD CONSTRAINT "managed_unit_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "managed_unit"
    ADD CONSTRAINT "managed_unit_buildingId_fkey"
    FOREIGN KEY ("buildingId") REFERENCES "managed_building"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "managed_unit"
    ADD CONSTRAINT "managed_unit_entranceId_fkey"
    FOREIGN KEY ("entranceId") REFERENCES "building_entrance_section"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "managed_unit"
    ADD CONSTRAINT "managed_unit_sourceUnitId_fkey"
    FOREIGN KEY ("sourceUnitId") REFERENCES "unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ----------------------------------------------------------------------------
-- 6) BuildingPerson — vlasnici, zakupci, korisnici
-- ----------------------------------------------------------------------------

CREATE TABLE "building_person" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "buildingId" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "legalName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "primaryRole" "ManagedPersonRole" NOT NULL DEFAULT 'OWNER',
    "notes" TEXT,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "building_person_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "building_person_organizationId_buildingId_idx" ON "building_person"("organizationId","buildingId");

ALTER TABLE "building_person"
    ADD CONSTRAINT "building_person_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "building_person"
    ADD CONSTRAINT "building_person_buildingId_fkey"
    FOREIGN KEY ("buildingId") REFERENCES "managed_building"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ----------------------------------------------------------------------------
-- 7) UnitOwnership — veza osoba↔posebni deo
-- ----------------------------------------------------------------------------

CREATE TABLE "unit_ownership" (
    "id" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "role" "ManagedPersonRole" NOT NULL DEFAULT 'OWNER',
    "sharePercent" DECIMAL(5,2) NOT NULL DEFAULT 100,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "isPrimary" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "unit_ownership_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "unit_ownership_unitId_endedAt_idx" ON "unit_ownership"("unitId","endedAt");
CREATE INDEX "unit_ownership_personId_idx" ON "unit_ownership"("personId");

ALTER TABLE "unit_ownership"
    ADD CONSTRAINT "unit_ownership_unitId_fkey"
    FOREIGN KEY ("unitId") REFERENCES "managed_unit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "unit_ownership"
    ADD CONSTRAINT "unit_ownership_personId_fkey"
    FOREIGN KEY ("personId") REFERENCES "building_person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ----------------------------------------------------------------------------
-- 8) Finansije: tarife, zaduženja, uplate, korekcije
-- ----------------------------------------------------------------------------

CREATE TABLE "dues_tariff" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "buildingId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "DuesTariffKind" NOT NULL,
    "basis" "DuesTariffBasis" NOT NULL,
    "amount" DECIMAL(14,4) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'RSD',
    "unitTypeFilter" "ManagedUnitType",
    "effectiveFrom" DATE NOT NULL,
    "effectiveTo" DATE,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "dues_tariff_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "dues_tariff_buildingId_kind_effectiveFrom_idx" ON "dues_tariff"("buildingId","kind","effectiveFrom");
ALTER TABLE "dues_tariff" ADD CONSTRAINT "dues_tariff_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "dues_tariff" ADD CONSTRAINT "dues_tariff_buildingId_fkey"
    FOREIGN KEY ("buildingId") REFERENCES "managed_building"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "dues_charge" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "buildingId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "periodYear" INTEGER NOT NULL,
    "periodMonth" INTEGER NOT NULL,
    "dueDate" DATE NOT NULL,
    "totalAmount" DECIMAL(14,2) NOT NULL,
    "paidAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'RSD',
    "status" "DuesChargeStatus" NOT NULL DEFAULT 'OPEN',
    "breakdown" JSONB NOT NULL DEFAULT '{}',
    "reference" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "dues_charge_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "dues_charge_reference_key" ON "dues_charge"("reference");
CREATE UNIQUE INDEX "dues_charge_unitId_periodYear_periodMonth_key" ON "dues_charge"("unitId","periodYear","periodMonth");
CREATE INDEX "dues_charge_buildingId_periodYear_periodMonth_idx" ON "dues_charge"("buildingId","periodYear","periodMonth");
CREATE INDEX "dues_charge_organizationId_status_dueDate_idx" ON "dues_charge"("organizationId","status","dueDate");
ALTER TABLE "dues_charge" ADD CONSTRAINT "dues_charge_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "dues_charge" ADD CONSTRAINT "dues_charge_buildingId_fkey"
    FOREIGN KEY ("buildingId") REFERENCES "managed_building"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "dues_charge" ADD CONSTRAINT "dues_charge_unitId_fkey"
    FOREIGN KEY ("unitId") REFERENCES "managed_unit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "dues_payment" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "chargeId" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'RSD',
    "paidAt" TIMESTAMP(3) NOT NULL,
    "method" "BillingPaymentMethod" NOT NULL DEFAULT 'BANK_TRANSFER',
    "reference" TEXT,
    "bankTransactionId" TEXT,
    "recordedByUserId" TEXT,
    "reversed" BOOLEAN NOT NULL DEFAULT false,
    "reversedAt" TIMESTAMP(3),
    "reversalReason" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "dues_payment_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "dues_payment_organizationId_paidAt_idx" ON "dues_payment"("organizationId","paidAt");
CREATE INDEX "dues_payment_chargeId_idx" ON "dues_payment"("chargeId");
ALTER TABLE "dues_payment" ADD CONSTRAINT "dues_payment_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "dues_payment" ADD CONSTRAINT "dues_payment_chargeId_fkey"
    FOREIGN KEY ("chargeId") REFERENCES "dues_charge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "dues_adjustment" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "reason" TEXT NOT NULL,
    "effectiveDate" DATE NOT NULL,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "dues_adjustment_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "dues_adjustment_organizationId_unitId_idx" ON "dues_adjustment"("organizationId","unitId");
ALTER TABLE "dues_adjustment" ADD CONSTRAINT "dues_adjustment_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ----------------------------------------------------------------------------
-- 9) Održavanje: izvođači, kvarovi, istorija, troškovi
-- ----------------------------------------------------------------------------

CREATE TABLE "supplier" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "buildingId" TEXT,
    "name" TEXT NOT NULL,
    "category" "MaintenanceCategory",
    "contactPerson" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "taxNumber" TEXT,
    "notes" TEXT,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "supplier_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "supplier_organizationId_archivedAt_idx" ON "supplier"("organizationId","archivedAt");
ALTER TABLE "supplier" ADD CONSTRAINT "supplier_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "supplier" ADD CONSTRAINT "supplier_buildingId_fkey"
    FOREIGN KEY ("buildingId") REFERENCES "managed_building"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "maintenance_ticket" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "buildingId" TEXT NOT NULL,
    "unitId" TEXT,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" "MaintenanceCategory" NOT NULL DEFAULT 'OTHER',
    "priority" "MaintenancePriority" NOT NULL DEFAULT 'NORMAL',
    "status" "MaintenanceStatus" NOT NULL DEFAULT 'OPEN',
    "reportedByPersonId" TEXT,
    "reportedByUserId" TEXT,
    "assignedToUserId" TEXT,
    "supplierId" TEXT,
    "estimatedCost" DECIMAL(14,2),
    "actualCost" DECIMAL(14,2),
    "currency" TEXT NOT NULL DEFAULT 'RSD',
    "fund" "BuildingExpenseFund",
    "completedAt" TIMESTAMP(3),
    "closedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "maintenance_ticket_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "maintenance_ticket_organizationId_code_key" ON "maintenance_ticket"("organizationId","code");
CREATE INDEX "maintenance_ticket_buildingId_status_idx" ON "maintenance_ticket"("buildingId","status");
CREATE INDEX "maintenance_ticket_organizationId_status_createdAt_idx" ON "maintenance_ticket"("organizationId","status","createdAt");
ALTER TABLE "maintenance_ticket" ADD CONSTRAINT "maintenance_ticket_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "maintenance_ticket" ADD CONSTRAINT "maintenance_ticket_buildingId_fkey"
    FOREIGN KEY ("buildingId") REFERENCES "managed_building"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "maintenance_ticket" ADD CONSTRAINT "maintenance_ticket_unitId_fkey"
    FOREIGN KEY ("unitId") REFERENCES "managed_unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "maintenance_ticket" ADD CONSTRAINT "maintenance_ticket_supplierId_fkey"
    FOREIGN KEY ("supplierId") REFERENCES "supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "maintenance_ticket_history" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "fromStatus" "MaintenanceStatus",
    "toStatus" "MaintenanceStatus" NOT NULL,
    "note" TEXT,
    "changedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "maintenance_ticket_history_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "maintenance_ticket_history_ticketId_createdAt_idx" ON "maintenance_ticket_history"("ticketId","createdAt");
ALTER TABLE "maintenance_ticket_history" ADD CONSTRAINT "maintenance_ticket_history_ticketId_fkey"
    FOREIGN KEY ("ticketId") REFERENCES "maintenance_ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "building_expense" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "buildingId" TEXT NOT NULL,
    "ticketId" TEXT,
    "supplierId" TEXT,
    "fund" "BuildingExpenseFund" NOT NULL DEFAULT 'CURRENT_MAINTENANCE',
    "description" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'RSD',
    "spentAt" DATE NOT NULL,
    "invoiceDocumentId" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "building_expense_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "building_expense_buildingId_fund_spentAt_idx" ON "building_expense"("buildingId","fund","spentAt");
ALTER TABLE "building_expense" ADD CONSTRAINT "building_expense_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "building_expense" ADD CONSTRAINT "building_expense_buildingId_fkey"
    FOREIGN KEY ("buildingId") REFERENCES "managed_building"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "building_expense" ADD CONSTRAINT "building_expense_ticketId_fkey"
    FOREIGN KEY ("ticketId") REFERENCES "maintenance_ticket"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "building_expense" ADD CONSTRAINT "building_expense_supplierId_fkey"
    FOREIGN KEY ("supplierId") REFERENCES "supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ----------------------------------------------------------------------------
-- 10) Skupština: Assembly, AgendaItem, AssemblyVote, Invitation
-- ----------------------------------------------------------------------------

CREATE TABLE "assembly" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "buildingId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "AssemblyType" NOT NULL DEFAULT 'REGULAR',
    "status" "AssemblyStatus" NOT NULL DEFAULT 'SCHEDULED',
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "votingOpensAt" TIMESTAMP(3),
    "votingClosesAt" TIMESTAMP(3),
    "location" TEXT,
    "quorumNote" TEXT,
    "minutesDocumentId" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "assembly_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "assembly_organizationId_code_key" ON "assembly"("organizationId","code");
CREATE INDEX "assembly_buildingId_scheduledAt_idx" ON "assembly"("buildingId","scheduledAt");
ALTER TABLE "assembly" ADD CONSTRAINT "assembly_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "assembly" ADD CONSTRAINT "assembly_buildingId_fkey"
    FOREIGN KEY ("buildingId") REFERENCES "managed_building"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "agenda_item" (
    "id" TEXT NOT NULL,
    "assemblyId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "voteKind" "AgendaItemVoteKind" NOT NULL DEFAULT 'DECISION',
    "majority" "AgendaItemMajority" NOT NULL DEFAULT 'SIMPLE',
    "resultSummary" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "agenda_item_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "agenda_item_assemblyId_sortOrder_idx" ON "agenda_item"("assemblyId","sortOrder");
ALTER TABLE "agenda_item" ADD CONSTRAINT "agenda_item_assemblyId_fkey"
    FOREIGN KEY ("assemblyId") REFERENCES "assembly"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "assembly_vote" (
    "id" TEXT NOT NULL,
    "agendaItemId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "personId" TEXT,
    "choice" "AssemblyVoteChoice" NOT NULL,
    "weight" DECIMAL(10,4) NOT NULL,
    "castByUserId" TEXT,
    "castAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    CONSTRAINT "assembly_vote_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "assembly_vote_agendaItemId_unitId_key" ON "assembly_vote"("agendaItemId","unitId");
CREATE INDEX "assembly_vote_agendaItemId_idx" ON "assembly_vote"("agendaItemId");
ALTER TABLE "assembly_vote" ADD CONSTRAINT "assembly_vote_agendaItemId_fkey"
    FOREIGN KEY ("agendaItemId") REFERENCES "agenda_item"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "assembly_vote" ADD CONSTRAINT "assembly_vote_unitId_fkey"
    FOREIGN KEY ("unitId") REFERENCES "managed_unit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "assembly_invitation" (
    "id" TEXT NOT NULL,
    "assemblyId" TEXT NOT NULL,
    "personId" TEXT,
    "email" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "openedAt" TIMESTAMP(3),
    CONSTRAINT "assembly_invitation_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "assembly_invitation_assemblyId_idx" ON "assembly_invitation"("assemblyId");
ALTER TABLE "assembly_invitation" ADD CONSTRAINT "assembly_invitation_assemblyId_fkey"
    FOREIGN KEY ("assemblyId") REFERENCES "assembly"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ----------------------------------------------------------------------------
-- 11) Obaveštenja i stanari (ResidentAccess)
-- ----------------------------------------------------------------------------

CREATE TABLE "building_notice" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "buildingId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "channel" "BuildingNoticeChannel" NOT NULL DEFAULT 'PORTAL_AND_EMAIL',
    "audience" "BuildingNoticeAudience" NOT NULL DEFAULT 'ALL',
    "audienceParams" JSONB NOT NULL DEFAULT '{}',
    "publishedAt" TIMESTAMP(3),
    "publishedByUserId" TEXT,
    "emailDeliveredCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "building_notice_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "building_notice_buildingId_publishedAt_idx" ON "building_notice"("buildingId","publishedAt");
ALTER TABLE "building_notice" ADD CONSTRAINT "building_notice_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "building_notice" ADD CONSTRAINT "building_notice_buildingId_fkey"
    FOREIGN KEY ("buildingId") REFERENCES "managed_building"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "resident_access" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "userId" TEXT,
    "email" TEXT NOT NULL,
    "status" "ResidentAccessStatus" NOT NULL DEFAULT 'PENDING_INVITE',
    "invitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "revokedReason" TEXT,
    "inviteToken" TEXT,
    "inviteExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "resident_access_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "resident_access_inviteToken_key" ON "resident_access"("inviteToken");
CREATE UNIQUE INDEX "resident_access_unitId_email_key" ON "resident_access"("unitId","email");
CREATE INDEX "resident_access_organizationId_status_idx" ON "resident_access"("organizationId","status");
CREATE INDEX "resident_access_userId_idx" ON "resident_access"("userId");
ALTER TABLE "resident_access" ADD CONSTRAINT "resident_access_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "resident_access" ADD CONSTRAINT "resident_access_personId_fkey"
    FOREIGN KEY ("personId") REFERENCES "building_person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "resident_access" ADD CONSTRAINT "resident_access_unitId_fkey"
    FOREIGN KEY ("unitId") REFERENCES "managed_unit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "resident_access" ADD CONSTRAINT "resident_access_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ----------------------------------------------------------------------------
-- 12) Prenos zgrade od investitora upravniku
-- ----------------------------------------------------------------------------

CREATE TABLE "building_handover_request" (
    "id" TEXT NOT NULL,
    "sourceOrganizationId" TEXT NOT NULL,
    "sourceProjectId" TEXT NOT NULL,
    "targetBuildingId" TEXT,
    "targetOrganizationId" TEXT,
    "targetContactEmail" TEXT NOT NULL,
    "targetContactName" TEXT,
    "targetTaxNumber" TEXT,
    "summary" JSONB NOT NULL DEFAULT '{}',
    "status" "BuildingHandoverStatus" NOT NULL DEFAULT 'PENDING',
    "initiatedByUserId" TEXT,
    "initiatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedByUserId" TEXT,
    "acceptedAt" TIMESTAMP(3),
    "rejectedByUserId" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "rejectedReason" TEXT,
    "canceledAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "building_handover_request_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "building_handover_request_sourceOrganizationId_status_idx" ON "building_handover_request"("sourceOrganizationId","status");
CREATE INDEX "building_handover_request_targetOrganizationId_status_idx" ON "building_handover_request"("targetOrganizationId","status");
CREATE INDEX "building_handover_request_sourceProjectId_idx" ON "building_handover_request"("sourceProjectId");
ALTER TABLE "building_handover_request" ADD CONSTRAINT "building_handover_request_sourceOrganizationId_fkey"
    FOREIGN KEY ("sourceOrganizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "building_handover_request" ADD CONSTRAINT "building_handover_request_sourceProjectId_fkey"
    FOREIGN KEY ("sourceProjectId") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "building_handover_request" ADD CONSTRAINT "building_handover_request_targetOrganizationId_fkey"
    FOREIGN KEY ("targetOrganizationId") REFERENCES "organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "building_handover_request" ADD CONSTRAINT "building_handover_request_targetBuildingId_fkey"
    FOREIGN KEY ("targetBuildingId") REFERENCES "managed_building"("id") ON DELETE SET NULL ON UPDATE CASCADE;
