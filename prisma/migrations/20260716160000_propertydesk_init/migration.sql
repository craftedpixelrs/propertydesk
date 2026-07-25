-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "OrganizationType" AS ENUM ('INVESTOR', 'AGENCY');

-- CreateEnum
CREATE TYPE "OrganizationStatus" AS ENUM ('TRIAL', 'ACTIVE', 'SUSPENDED', 'CLOSED');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIAL', 'ACTIVE', 'PAST_DUE', 'SUSPENDED', 'CANCELED');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('DRAFT', 'PRE_SALES', 'ACTIVE_SALES', 'CONSTRUCTION', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "UnitType" AS ENUM ('APARTMENT', 'GARAGE', 'PARKING_SPACE', 'STORAGE', 'COMMERCIAL', 'HOUSE', 'OTHER');

-- CreateEnum
CREATE TYPE "UnitStatus" AS ENUM ('AVAILABLE', 'ON_HOLD', 'RESERVED', 'DEPOSIT_PAID', 'CONTRACTED', 'SOLD', 'BLOCKED', 'NOT_FOR_SALE');

-- CreateEnum
CREATE TYPE "ContactMethod" AS ENUM ('PHONE', 'EMAIL', 'ANY');

-- CreateEnum
CREATE TYPE "BuyerStatus" AS ENUM ('NEW', 'CONTACTED', 'QUALIFIED', 'VIEWING_SCHEDULED', 'OFFER_SENT', 'NEGOTIATION', 'RESERVATION', 'WON', 'LOST', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('NOTE', 'CALL', 'EMAIL', 'MEETING', 'VIEWING', 'OFFER', 'STATUS_CHANGE', 'SYSTEM');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELED');

-- CreateEnum
CREATE TYPE "TaskPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "ReservationSource" AS ENUM ('INTERNAL', 'AGENCY');

-- CreateEnum
CREATE TYPE "ReservationStatus" AS ENUM ('REQUESTED', 'APPROVED', 'REJECTED', 'EXPIRED', 'CANCELED', 'CONVERTED');

-- CreateEnum
CREATE TYPE "AgencyConnectionStatus" AS ENUM ('INVITED', 'ACTIVE', 'SUSPENDED', 'REJECTED', 'TERMINATED');

-- CreateEnum
CREATE TYPE "AgencyProjectAccessStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'ENDED');

-- CreateEnum
CREATE TYPE "AgencyBuyerRegistrationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED', 'CONVERTED', 'CANCELED', 'CONFLICT_REVIEW');

-- CreateEnum
CREATE TYPE "CommissionCalculationType" AS ENUM ('PERCENTAGE', 'FIXED');

-- CreateEnum
CREATE TYPE "SaleStatus" AS ENUM ('DRAFT', 'PRE_CONTRACT', 'CONTRACTED', 'PAYMENT_IN_PROGRESS', 'PAID', 'HANDED_OVER', 'CANCELED');

-- CreateEnum
CREATE TYPE "SaleDiscountType" AS ENUM ('PERCENTAGE', 'FIXED');

-- CreateEnum
CREATE TYPE "PaymentPlanStatus" AS ENUM ('DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELED');

-- CreateEnum
CREATE TYPE "InstallmentStatus" AS ENUM ('UPCOMING', 'DUE', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('BANK_TRANSFER', 'CASH', 'CARD', 'LOAN', 'COMPENSATION', 'OTHER');

-- CreateEnum
CREATE TYPE "DocumentCategory" AS ENUM ('PROJECT', 'UNIT', 'BUYER', 'RESERVATION', 'SALE', 'PAYMENT', 'AGENCY', 'COMMISSION', 'OTHER');

-- CreateEnum
CREATE TYPE "DocumentVisibility" AS ENUM ('INTERNAL', 'INVESTOR_TEAM', 'AGENCY_SHARED', 'BUYER_SHARED');

-- CreateEnum
CREATE TYPE "CommissionStatus" AS ENUM ('CALCULATED', 'APPROVED', 'INVOICED', 'DUE', 'PAID', 'DISPUTED', 'CANCELED');

-- CreateEnum
CREATE TYPE "NotificationCategory" AS ENUM ('SYSTEM', 'TASK', 'BUYER', 'RESERVATION', 'SALE', 'PAYMENT', 'AGENCY', 'COMMISSION', 'DOCUMENT');

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "role" TEXT,
    "banned" BOOLEAN DEFAULT false,
    "banReason" TEXT,
    "banExpires" TIMESTAMP(3),
    "deactivatedAt" TIMESTAMP(3),

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "impersonatedBy" TEXT,
    "activeOrganizationId" TEXT,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT,
    "logo" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "member" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invitation" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT,
    "status" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "inviterId" TEXT NOT NULL,

    CONSTRAINT "invitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_profile" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "type" "OrganizationType" NOT NULL,
    "legalName" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "registrationNumber" TEXT,
    "taxNumber" TEXT,
    "address" TEXT,
    "city" TEXT,
    "postalCode" TEXT,
    "country" TEXT DEFAULT 'RS',
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "logoUrl" TEXT,
    "status" "OrganizationStatus" NOT NULL DEFAULT 'TRIAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saas_plan" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "monthlyPrice" DECIMAL(14,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "maxActiveProjects" INTEGER,
    "maxUnits" INTEGER,
    "maxMembers" INTEGER,
    "maxAgencyConnections" INTEGER,
    "features" JSONB NOT NULL DEFAULT '{}',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "saas_plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_subscription" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'TRIAL',
    "trialEndsAt" TIMESTAMP(3),
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" TIMESTAMP(3),
    "manuallyManaged" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "actorUserId" TEXT,
    "impersonatedByUserId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "previousValues" JSONB,
    "newValues" JSONB,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "address" TEXT,
    "city" TEXT,
    "municipality" TEXT,
    "postalCode" TEXT,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "projectStatus" "ProjectStatus" NOT NULL DEFAULT 'DRAFT',
    "salesStartDate" TIMESTAMP(3),
    "constructionStartDate" TIMESTAMP(3),
    "expectedCompletionDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "defaultCurrency" TEXT NOT NULL DEFAULT 'EUR',
    "defaultVatRate" DECIMAL(5,2),
    "coverImageUrl" TEXT,
    "internalNotes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "building" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "building_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entrance" (
    "id" TEXT NOT NULL,
    "buildingId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "entrance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "floor" (
    "id" TEXT NOT NULL,
    "entranceId" TEXT NOT NULL,
    "number" INTEGER,
    "label" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "floorPlanUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "floor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "unit" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "buildingId" TEXT,
    "entranceId" TEXT,
    "floorId" TEXT,
    "code" TEXT NOT NULL,
    "externalReference" TEXT,
    "type" "UnitType" NOT NULL,
    "status" "UnitStatus" NOT NULL DEFAULT 'AVAILABLE',
    "structure" TEXT,
    "roomCount" DECIMAL(4,1),
    "totalArea" DECIMAL(10,2) NOT NULL,
    "internalArea" DECIMAL(10,2),
    "terraceArea" DECIMAL(10,2),
    "gardenArea" DECIMAL(10,2),
    "orientation" TEXT,
    "basePrice" DECIMAL(14,2) NOT NULL,
    "finalPrice" DECIMAL(14,2),
    "pricePerSquareMeter" DECIMAL(14,2),
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "vatRate" DECIMAL(5,2),
    "vatIncluded" BOOLEAN NOT NULL DEFAULT false,
    "bedrooms" INTEGER,
    "bathrooms" INTEGER,
    "hasTerrace" BOOLEAN NOT NULL DEFAULT false,
    "hasGarden" BOOLEAN NOT NULL DEFAULT false,
    "floorPlanUrl" TEXT,
    "publicDescription" TEXT,
    "internalNotes" TEXT,
    "isVisibleToAgencies" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "unit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "unit_price_history" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "previousBasePrice" DECIMAL(14,2) NOT NULL,
    "newBasePrice" DECIMAL(14,2) NOT NULL,
    "previousFinalPrice" DECIMAL(14,2),
    "newFinalPrice" DECIMAL(14,2),
    "currency" TEXT NOT NULL,
    "reason" TEXT,
    "changedByUserId" TEXT NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "unit_price_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "unit_status_history" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "previousStatus" "UnitStatus" NOT NULL,
    "newStatus" "UnitStatus" NOT NULL,
    "reason" TEXT,
    "changedByUserId" TEXT NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "unit_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "buyer" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "normalizedEmail" TEXT,
    "phone" TEXT NOT NULL,
    "normalizedPhone" TEXT NOT NULL,
    "secondaryPhone" TEXT,
    "preferredContactMethod" "ContactMethod" NOT NULL DEFAULT 'ANY',
    "budgetMin" DECIMAL(14,2),
    "budgetMax" DECIMAL(14,2),
    "preferredCurrency" TEXT NOT NULL DEFAULT 'EUR',
    "desiredUnitTypes" "UnitType"[] DEFAULT ARRAY[]::"UnitType"[],
    "desiredRoomCounts" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "desiredAreaMin" DECIMAL(10,2),
    "desiredAreaMax" DECIMAL(10,2),
    "notes" TEXT,
    "source" TEXT,
    "status" "BuyerStatus" NOT NULL DEFAULT 'NEW',
    "assignedUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "buyer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "buyer_interest" (
    "id" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "projectId" TEXT,
    "unitId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "buyer_interest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "buyerId" TEXT,
    "projectId" TEXT,
    "unitId" TEXT,
    "actorUserId" TEXT NOT NULL,
    "type" "ActivityType" NOT NULL,
    "description" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "assignedUserId" TEXT NOT NULL,
    "buyerId" TEXT,
    "projectId" TEXT,
    "unitId" TEXT,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "priority" "TaskPriority" NOT NULL DEFAULT 'NORMAL',
    "status" "TaskStatus" NOT NULL DEFAULT 'OPEN',
    "completedAt" TIMESTAMP(3),
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reservation" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "assignedUserId" TEXT,
    "sourceType" "ReservationSource" NOT NULL DEFAULT 'INTERNAL',
    "agencyOrganizationId" TEXT,
    "agencyAgentUserId" TEXT,
    "status" "ReservationStatus" NOT NULL DEFAULT 'REQUESTED',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "canceledAt" TIMESTAMP(3),
    "convertedAt" TIMESTAMP(3),
    "reservationAmount" DECIMAL(14,2),
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "notes" TEXT,
    "rejectionReason" TEXT,
    "cancellationReason" TEXT,
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reservation_status_history" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "reservationId" TEXT NOT NULL,
    "previousStatus" "ReservationStatus" NOT NULL,
    "newStatus" "ReservationStatus" NOT NULL,
    "reason" TEXT,
    "changedByUserId" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reservation_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agency_connection" (
    "id" TEXT NOT NULL,
    "investorOrganizationId" TEXT NOT NULL,
    "agencyOrganizationId" TEXT NOT NULL,
    "status" "AgencyConnectionStatus" NOT NULL DEFAULT 'INVITED',
    "invitedByUserId" TEXT NOT NULL,
    "invitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),
    "suspendedAt" TIMESTAMP(3),
    "suspendedByUserId" TEXT,
    "notes" TEXT,
    "defaultProtectionDays" INTEGER NOT NULL DEFAULT 30,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agency_connection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agency_project_access" (
    "id" TEXT NOT NULL,
    "agencyConnectionId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "status" "AgencyProjectAccessStatus" NOT NULL DEFAULT 'ACTIVE',
    "accessStartsAt" TIMESTAMP(3),
    "accessEndsAt" TIMESTAMP(3),
    "canViewPrices" BOOLEAN NOT NULL DEFAULT true,
    "canViewFloorPlans" BOOLEAN NOT NULL DEFAULT true,
    "canRequestReservations" BOOLEAN NOT NULL DEFAULT true,
    "showOnlyAgencyVisibleUnits" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agency_project_access_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agency_unit_access_override" (
    "id" TEXT NOT NULL,
    "agencyConnectionId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agency_unit_access_override_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agency_buyer_registration" (
    "id" TEXT NOT NULL,
    "investorOrganizationId" TEXT NOT NULL,
    "agencyOrganizationId" TEXT NOT NULL,
    "agencyAgentUserId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "status" "AgencyBuyerRegistrationStatus" NOT NULL DEFAULT 'PENDING',
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "protectionStartsAt" TIMESTAMP(3),
    "protectionEndsAt" TIMESTAMP(3),
    "reviewedByUserId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "conflictNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agency_buyer_registration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agency_commission_rule" (
    "id" TEXT NOT NULL,
    "investorOrganizationId" TEXT NOT NULL,
    "agencyConnectionId" TEXT,
    "projectId" TEXT,
    "unitId" TEXT,
    "calculationType" "CommissionCalculationType" NOT NULL,
    "rate" DECIMAL(6,3),
    "fixedAmount" DECIMAL(14,2),
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "validFrom" TIMESTAMP(3),
    "validTo" TIMESTAMP(3),
    "internalNote" TEXT,
    "agencyVisibleNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agency_commission_rule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sale" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "reservationId" TEXT,
    "sourceType" "ReservationSource" NOT NULL DEFAULT 'INTERNAL',
    "agencyOrganizationId" TEXT,
    "agencyAgentUserId" TEXT,
    "responsibleUserId" TEXT NOT NULL,
    "status" "SaleStatus" NOT NULL DEFAULT 'DRAFT',
    "listPrice" DECIMAL(14,2) NOT NULL,
    "discountType" "SaleDiscountType",
    "discountValue" DECIMAL(14,2),
    "finalPrice" DECIMAL(14,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "depositAmount" DECIMAL(14,2),
    "preContractDate" TIMESTAMP(3),
    "contractDate" TIMESTAMP(3),
    "plannedHandoverDate" TIMESTAMP(3),
    "actualHandoverDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "sale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sale_status_history" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "previousStatus" "SaleStatus" NOT NULL,
    "newStatus" "SaleStatus" NOT NULL,
    "reason" TEXT,
    "changedByUserId" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sale_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_plan" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "totalAmount" DECIMAL(14,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "status" "PaymentPlanStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_installment" (
    "id" TEXT NOT NULL,
    "paymentPlanId" TEXT NOT NULL,
    "sequenceNumber" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "percentage" DECIMAL(6,3),
    "dueDate" TIMESTAMP(3) NOT NULL,
    "status" "InstallmentStatus" NOT NULL DEFAULT 'UPCOMING',
    "paidAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "paidAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_installment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "installmentId" TEXT,
    "amount" DECIMAL(14,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "paymentDate" TIMESTAMP(3) NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "referenceNumber" TEXT,
    "note" TEXT,
    "proofDocumentId" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reversedAt" TIMESTAMP(3),
    "reversedByUserId" TEXT,
    "reversalReason" TEXT,

    CONSTRAINT "payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "category" "DocumentCategory" NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "originalFileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "uploadedByUserId" TEXT NOT NULL,
    "visibility" "DocumentVisibility" NOT NULL DEFAULT 'INTERNAL',
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commission" (
    "id" TEXT NOT NULL,
    "investorOrganizationId" TEXT NOT NULL,
    "agencyOrganizationId" TEXT NOT NULL,
    "agencyAgentUserId" TEXT,
    "saleId" TEXT NOT NULL,
    "commissionRuleId" TEXT,
    "calculationType" "CommissionCalculationType" NOT NULL,
    "rate" DECIMAL(6,3),
    "fixedAmount" DECIMAL(14,2),
    "baseAmount" DECIMAL(14,2) NOT NULL,
    "calculatedAmount" DECIMAL(14,2) NOT NULL,
    "adjustedAmount" DECIMAL(14,2),
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "status" "CommissionStatus" NOT NULL DEFAULT 'CALCULATED',
    "approvedAt" TIMESTAMP(3),
    "invoicedAt" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "invoiceNumber" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "commission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "userId" TEXT NOT NULL,
    "category" "NotificationCategory" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "actionUrl" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE INDEX "user_email_idx" ON "user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "session"("token");

-- CreateIndex
CREATE INDEX "session_userId_idx" ON "session"("userId");

-- CreateIndex
CREATE INDEX "session_expiresAt_idx" ON "session"("expiresAt");

-- CreateIndex
CREATE INDEX "account_userId_idx" ON "account"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "account_providerId_accountId_key" ON "account"("providerId", "accountId");

-- CreateIndex
CREATE INDEX "verification_identifier_idx" ON "verification"("identifier");

-- CreateIndex
CREATE UNIQUE INDEX "organization_slug_key" ON "organization"("slug");

-- CreateIndex
CREATE INDEX "member_userId_idx" ON "member"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "member_organizationId_userId_key" ON "member"("organizationId", "userId");

-- CreateIndex
CREATE INDEX "invitation_organizationId_idx" ON "invitation"("organizationId");

-- CreateIndex
CREATE INDEX "invitation_email_idx" ON "invitation"("email");

-- CreateIndex
CREATE UNIQUE INDEX "organization_profile_organizationId_key" ON "organization_profile"("organizationId");

-- CreateIndex
CREATE INDEX "organization_profile_type_idx" ON "organization_profile"("type");

-- CreateIndex
CREATE INDEX "organization_profile_status_idx" ON "organization_profile"("status");

-- CreateIndex
CREATE UNIQUE INDEX "saas_plan_code_key" ON "saas_plan"("code");

-- CreateIndex
CREATE UNIQUE INDEX "organization_subscription_organizationId_key" ON "organization_subscription"("organizationId");

-- CreateIndex
CREATE INDEX "organization_subscription_status_idx" ON "organization_subscription"("status");

-- CreateIndex
CREATE INDEX "audit_log_organizationId_createdAt_idx" ON "audit_log"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_log_actorUserId_createdAt_idx" ON "audit_log"("actorUserId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_log_entityType_entityId_idx" ON "audit_log"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "project_organizationId_projectStatus_idx" ON "project"("organizationId", "projectStatus");

-- CreateIndex
CREATE INDEX "project_organizationId_isActive_idx" ON "project"("organizationId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "project_organizationId_code_key" ON "project"("organizationId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "project_organizationId_slug_key" ON "project"("organizationId", "slug");

-- CreateIndex
CREATE INDEX "building_projectId_sortOrder_idx" ON "building"("projectId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "building_projectId_code_key" ON "building"("projectId", "code");

-- CreateIndex
CREATE INDEX "entrance_buildingId_sortOrder_idx" ON "entrance"("buildingId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "entrance_buildingId_code_key" ON "entrance"("buildingId", "code");

-- CreateIndex
CREATE INDEX "floor_entranceId_sortOrder_idx" ON "floor"("entranceId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "floor_entranceId_label_key" ON "floor"("entranceId", "label");

-- CreateIndex
CREATE INDEX "unit_organizationId_status_idx" ON "unit"("organizationId", "status");

-- CreateIndex
CREATE INDEX "unit_organizationId_projectId_status_idx" ON "unit"("organizationId", "projectId", "status");

-- CreateIndex
CREATE INDEX "unit_projectId_buildingId_idx" ON "unit"("projectId", "buildingId");

-- CreateIndex
CREATE INDEX "unit_projectId_type_idx" ON "unit"("projectId", "type");

-- CreateIndex
CREATE INDEX "unit_organizationId_isVisibleToAgencies_idx" ON "unit"("organizationId", "isVisibleToAgencies");

-- CreateIndex
CREATE UNIQUE INDEX "unit_projectId_code_key" ON "unit"("projectId", "code");

-- CreateIndex
CREATE INDEX "unit_price_history_unitId_changedAt_idx" ON "unit_price_history"("unitId", "changedAt");

-- CreateIndex
CREATE INDEX "unit_price_history_organizationId_changedAt_idx" ON "unit_price_history"("organizationId", "changedAt");

-- CreateIndex
CREATE INDEX "unit_status_history_unitId_changedAt_idx" ON "unit_status_history"("unitId", "changedAt");

-- CreateIndex
CREATE INDEX "unit_status_history_organizationId_changedAt_idx" ON "unit_status_history"("organizationId", "changedAt");

-- CreateIndex
CREATE INDEX "buyer_organizationId_status_idx" ON "buyer"("organizationId", "status");

-- CreateIndex
CREATE INDEX "buyer_organizationId_normalizedPhone_idx" ON "buyer"("organizationId", "normalizedPhone");

-- CreateIndex
CREATE INDEX "buyer_organizationId_normalizedEmail_idx" ON "buyer"("organizationId", "normalizedEmail");

-- CreateIndex
CREATE INDEX "buyer_organizationId_assignedUserId_idx" ON "buyer"("organizationId", "assignedUserId");

-- CreateIndex
CREATE INDEX "buyer_interest_buyerId_idx" ON "buyer_interest"("buyerId");

-- CreateIndex
CREATE INDEX "activity_organizationId_occurredAt_idx" ON "activity"("organizationId", "occurredAt");

-- CreateIndex
CREATE INDEX "activity_buyerId_occurredAt_idx" ON "activity"("buyerId", "occurredAt");

-- CreateIndex
CREATE INDEX "task_organizationId_status_dueAt_idx" ON "task"("organizationId", "status", "dueAt");

-- CreateIndex
CREATE INDEX "task_assignedUserId_status_dueAt_idx" ON "task"("assignedUserId", "status", "dueAt");

-- CreateIndex
CREATE INDEX "reservation_organizationId_status_idx" ON "reservation"("organizationId", "status");

-- CreateIndex
CREATE INDEX "reservation_unitId_status_idx" ON "reservation"("unitId", "status");

-- CreateIndex
CREATE INDEX "reservation_expiresAt_idx" ON "reservation"("expiresAt");

-- CreateIndex
CREATE INDEX "reservation_status_history_reservationId_changedAt_idx" ON "reservation_status_history"("reservationId", "changedAt");

-- CreateIndex
CREATE INDEX "agency_connection_investorOrganizationId_status_idx" ON "agency_connection"("investorOrganizationId", "status");

-- CreateIndex
CREATE INDEX "agency_connection_agencyOrganizationId_status_idx" ON "agency_connection"("agencyOrganizationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "agency_connection_investorOrganizationId_agencyOrganization_key" ON "agency_connection"("investorOrganizationId", "agencyOrganizationId");

-- CreateIndex
CREATE INDEX "agency_project_access_projectId_status_idx" ON "agency_project_access"("projectId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "agency_project_access_agencyConnectionId_projectId_key" ON "agency_project_access"("agencyConnectionId", "projectId");

-- CreateIndex
CREATE UNIQUE INDEX "agency_unit_access_override_agencyConnectionId_unitId_key" ON "agency_unit_access_override"("agencyConnectionId", "unitId");

-- CreateIndex
CREATE INDEX "agency_buyer_registration_investorOrganizationId_status_idx" ON "agency_buyer_registration"("investorOrganizationId", "status");

-- CreateIndex
CREATE INDEX "agency_buyer_registration_agencyOrganizationId_status_idx" ON "agency_buyer_registration"("agencyOrganizationId", "status");

-- CreateIndex
CREATE INDEX "agency_buyer_registration_projectId_buyerId_status_idx" ON "agency_buyer_registration"("projectId", "buyerId", "status");

-- CreateIndex
CREATE INDEX "agency_buyer_registration_protectionEndsAt_idx" ON "agency_buyer_registration"("protectionEndsAt");

-- CreateIndex
CREATE INDEX "agency_commission_rule_investorOrganizationId_projectId_idx" ON "agency_commission_rule"("investorOrganizationId", "projectId");

-- CreateIndex
CREATE INDEX "agency_commission_rule_agencyConnectionId_idx" ON "agency_commission_rule"("agencyConnectionId");

-- CreateIndex
CREATE INDEX "agency_commission_rule_unitId_idx" ON "agency_commission_rule"("unitId");

-- CreateIndex
CREATE UNIQUE INDEX "sale_reservationId_key" ON "sale"("reservationId");

-- CreateIndex
CREATE INDEX "sale_organizationId_status_idx" ON "sale"("organizationId", "status");

-- CreateIndex
CREATE INDEX "sale_unitId_status_idx" ON "sale"("unitId", "status");

-- CreateIndex
CREATE INDEX "sale_projectId_status_idx" ON "sale"("projectId", "status");

-- CreateIndex
CREATE INDEX "sale_status_history_saleId_changedAt_idx" ON "sale_status_history"("saleId", "changedAt");

-- CreateIndex
CREATE UNIQUE INDEX "payment_plan_saleId_key" ON "payment_plan"("saleId");

-- CreateIndex
CREATE INDEX "payment_installment_paymentPlanId_dueDate_idx" ON "payment_installment"("paymentPlanId", "dueDate");

-- CreateIndex
CREATE INDEX "payment_installment_status_dueDate_idx" ON "payment_installment"("status", "dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "payment_installment_paymentPlanId_sequenceNumber_key" ON "payment_installment"("paymentPlanId", "sequenceNumber");

-- CreateIndex
CREATE INDEX "payment_organizationId_paymentDate_idx" ON "payment"("organizationId", "paymentDate");

-- CreateIndex
CREATE INDEX "payment_saleId_paymentDate_idx" ON "payment"("saleId", "paymentDate");

-- CreateIndex
CREATE INDEX "document_organizationId_category_idx" ON "document"("organizationId", "category");

-- CreateIndex
CREATE INDEX "document_entityType_entityId_idx" ON "document"("entityType", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "commission_saleId_key" ON "commission"("saleId");

-- CreateIndex
CREATE INDEX "commission_investorOrganizationId_status_idx" ON "commission"("investorOrganizationId", "status");

-- CreateIndex
CREATE INDEX "commission_agencyOrganizationId_status_idx" ON "commission"("agencyOrganizationId", "status");

-- CreateIndex
CREATE INDEX "notification_userId_readAt_idx" ON "notification"("userId", "readAt");

-- CreateIndex
CREATE INDEX "notification_userId_createdAt_idx" ON "notification"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "notification_organizationId_createdAt_idx" ON "notification"("organizationId", "createdAt");

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member" ADD CONSTRAINT "member_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member" ADD CONSTRAINT "member_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_profile" ADD CONSTRAINT "organization_profile_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_subscription" ADD CONSTRAINT "organization_subscription_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_subscription" ADD CONSTRAINT "organization_subscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "saas_plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_impersonatedByUserId_fkey" FOREIGN KEY ("impersonatedByUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project" ADD CONSTRAINT "project_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project" ADD CONSTRAINT "project_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "building" ADD CONSTRAINT "building_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entrance" ADD CONSTRAINT "entrance_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "building"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "floor" ADD CONSTRAINT "floor_entranceId_fkey" FOREIGN KEY ("entranceId") REFERENCES "entrance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unit" ADD CONSTRAINT "unit_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unit" ADD CONSTRAINT "unit_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unit" ADD CONSTRAINT "unit_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "building"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unit" ADD CONSTRAINT "unit_entranceId_fkey" FOREIGN KEY ("entranceId") REFERENCES "entrance"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unit" ADD CONSTRAINT "unit_floorId_fkey" FOREIGN KEY ("floorId") REFERENCES "floor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unit_price_history" ADD CONSTRAINT "unit_price_history_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unit_price_history" ADD CONSTRAINT "unit_price_history_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "unit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unit_price_history" ADD CONSTRAINT "unit_price_history_changedByUserId_fkey" FOREIGN KEY ("changedByUserId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unit_status_history" ADD CONSTRAINT "unit_status_history_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unit_status_history" ADD CONSTRAINT "unit_status_history_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "unit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unit_status_history" ADD CONSTRAINT "unit_status_history_changedByUserId_fkey" FOREIGN KEY ("changedByUserId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "buyer" ADD CONSTRAINT "buyer_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "buyer" ADD CONSTRAINT "buyer_assignedUserId_fkey" FOREIGN KEY ("assignedUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "buyer_interest" ADD CONSTRAINT "buyer_interest_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "buyer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "buyer_interest" ADD CONSTRAINT "buyer_interest_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "buyer_interest" ADD CONSTRAINT "buyer_interest_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity" ADD CONSTRAINT "activity_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity" ADD CONSTRAINT "activity_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "buyer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity" ADD CONSTRAINT "activity_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity" ADD CONSTRAINT "activity_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task" ADD CONSTRAINT "task_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task" ADD CONSTRAINT "task_assignedUserId_fkey" FOREIGN KEY ("assignedUserId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task" ADD CONSTRAINT "task_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "buyer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task" ADD CONSTRAINT "task_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task" ADD CONSTRAINT "task_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservation" ADD CONSTRAINT "reservation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservation" ADD CONSTRAINT "reservation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservation" ADD CONSTRAINT "reservation_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "unit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservation" ADD CONSTRAINT "reservation_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "buyer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservation" ADD CONSTRAINT "reservation_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservation" ADD CONSTRAINT "reservation_assignedUserId_fkey" FOREIGN KEY ("assignedUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservation" ADD CONSTRAINT "reservation_agencyAgentUserId_fkey" FOREIGN KEY ("agencyAgentUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservation_status_history" ADD CONSTRAINT "reservation_status_history_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservation_status_history" ADD CONSTRAINT "reservation_status_history_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "reservation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservation_status_history" ADD CONSTRAINT "reservation_status_history_changedByUserId_fkey" FOREIGN KEY ("changedByUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agency_connection" ADD CONSTRAINT "agency_connection_investorOrganizationId_fkey" FOREIGN KEY ("investorOrganizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agency_connection" ADD CONSTRAINT "agency_connection_agencyOrganizationId_fkey" FOREIGN KEY ("agencyOrganizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agency_connection" ADD CONSTRAINT "agency_connection_invitedByUserId_fkey" FOREIGN KEY ("invitedByUserId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agency_connection" ADD CONSTRAINT "agency_connection_suspendedByUserId_fkey" FOREIGN KEY ("suspendedByUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agency_project_access" ADD CONSTRAINT "agency_project_access_agencyConnectionId_fkey" FOREIGN KEY ("agencyConnectionId") REFERENCES "agency_connection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agency_project_access" ADD CONSTRAINT "agency_project_access_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agency_buyer_registration" ADD CONSTRAINT "agency_buyer_registration_investorOrganizationId_fkey" FOREIGN KEY ("investorOrganizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agency_buyer_registration" ADD CONSTRAINT "agency_buyer_registration_agencyOrganizationId_fkey" FOREIGN KEY ("agencyOrganizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agency_buyer_registration" ADD CONSTRAINT "agency_buyer_registration_agencyAgentUserId_fkey" FOREIGN KEY ("agencyAgentUserId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agency_buyer_registration" ADD CONSTRAINT "agency_buyer_registration_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agency_buyer_registration" ADD CONSTRAINT "agency_buyer_registration_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "buyer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agency_buyer_registration" ADD CONSTRAINT "agency_buyer_registration_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agency_commission_rule" ADD CONSTRAINT "agency_commission_rule_investorOrganizationId_fkey" FOREIGN KEY ("investorOrganizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agency_commission_rule" ADD CONSTRAINT "agency_commission_rule_agencyConnectionId_fkey" FOREIGN KEY ("agencyConnectionId") REFERENCES "agency_connection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agency_commission_rule" ADD CONSTRAINT "agency_commission_rule_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale" ADD CONSTRAINT "sale_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale" ADD CONSTRAINT "sale_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale" ADD CONSTRAINT "sale_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "unit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale" ADD CONSTRAINT "sale_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "buyer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale" ADD CONSTRAINT "sale_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "reservation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale" ADD CONSTRAINT "sale_responsibleUserId_fkey" FOREIGN KEY ("responsibleUserId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale" ADD CONSTRAINT "sale_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale" ADD CONSTRAINT "sale_agencyAgentUserId_fkey" FOREIGN KEY ("agencyAgentUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_status_history" ADD CONSTRAINT "sale_status_history_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_status_history" ADD CONSTRAINT "sale_status_history_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "sale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_status_history" ADD CONSTRAINT "sale_status_history_changedByUserId_fkey" FOREIGN KEY ("changedByUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_plan" ADD CONSTRAINT "payment_plan_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_plan" ADD CONSTRAINT "payment_plan_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "sale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_installment" ADD CONSTRAINT "payment_installment_paymentPlanId_fkey" FOREIGN KEY ("paymentPlanId") REFERENCES "payment_plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment" ADD CONSTRAINT "payment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment" ADD CONSTRAINT "payment_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "sale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment" ADD CONSTRAINT "payment_installmentId_fkey" FOREIGN KEY ("installmentId") REFERENCES "payment_installment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment" ADD CONSTRAINT "payment_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment" ADD CONSTRAINT "payment_reversedByUserId_fkey" FOREIGN KEY ("reversedByUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document" ADD CONSTRAINT "document_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document" ADD CONSTRAINT "document_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commission" ADD CONSTRAINT "commission_investorOrganizationId_fkey" FOREIGN KEY ("investorOrganizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commission" ADD CONSTRAINT "commission_agencyOrganizationId_fkey" FOREIGN KEY ("agencyOrganizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commission" ADD CONSTRAINT "commission_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "sale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification" ADD CONSTRAINT "notification_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification" ADD CONSTRAINT "notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
