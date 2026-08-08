-- =============================================================================
-- Billing module — enum extensions, plan/subscription extensions, new tables
-- -----------------------------------------------------------------------------
-- Adds the full SaaS billing automation surface: settings, company profile,
-- bank accounts, invoices, payments, subscription extensions, bank statement
-- imports, electronic invoice records, jobs, sequences, and email templates.
-- =============================================================================

-- Extend existing enums ------------------------------------------------------
ALTER TYPE "OrganizationStatus" ADD VALUE IF NOT EXISTS 'RESTRICTED' BEFORE 'SUSPENDED';

ALTER TYPE "SubscriptionStatus" ADD VALUE IF NOT EXISTS 'PAYMENT_DUE' BEFORE 'PAST_DUE';
ALTER TYPE "SubscriptionStatus" ADD VALUE IF NOT EXISTS 'RESTRICTED' BEFORE 'SUSPENDED';
ALTER TYPE "SubscriptionStatus" ADD VALUE IF NOT EXISTS 'EXPIRED';

ALTER TYPE "NotificationCategory" ADD VALUE IF NOT EXISTS 'BILLING';

ALTER TYPE "DocumentCategory" ADD VALUE IF NOT EXISTS 'INVOICE' BEFORE 'OTHER';

-- New enums ------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'BillingCycle') THEN
    CREATE TYPE "BillingCycle" AS ENUM ('MONTHLY', 'QUARTERLY', 'SEMI_ANNUAL', 'ANNUAL', 'CUSTOM');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'BillingPaymentMethod') THEN
    CREATE TYPE "BillingPaymentMethod" AS ENUM ('BANK_TRANSFER', 'CARD', 'OTHER');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'BillingSettingsMode') THEN
    CREATE TYPE "BillingSettingsMode" AS ENUM ('USE_GLOBAL_SETTINGS', 'CUSTOM_SETTINGS', 'BILLING_DISABLED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SefEnvironment') THEN
    CREATE TYPE "SefEnvironment" AS ENUM ('PRODUCTION', 'SANDBOX', 'DISABLED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'InvoiceStatus') THEN
    CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'ISSUED', 'SENT', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELED', 'VOID');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'InvoiceSource') THEN
    CREATE TYPE "InvoiceSource" AS ENUM ('AUTOMATIC', 'MANUAL', 'IMPORT');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'InvoiceItemType') THEN
    CREATE TYPE "InvoiceItemType" AS ENUM ('SUBSCRIPTION', 'ONBOARDING_FEE', 'ADJUSTMENT', 'CREDIT', 'ADD_ON', 'OTHER');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SubscriptionPaymentStatus') THEN
    CREATE TYPE "SubscriptionPaymentStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REVERSED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SubscriptionPaymentProvider') THEN
    CREATE TYPE "SubscriptionPaymentProvider" AS ENUM ('MANUAL', 'BANK_TRANSFER', 'CARD', 'BANK_STATEMENT', 'OTHER');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'BankStatementImportStatus') THEN
    CREATE TYPE "BankStatementImportStatus" AS ENUM ('PENDING', 'PROCESSED', 'PROCESSED_WITH_ERRORS', 'FAILED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'BankStatementFormat') THEN
    CREATE TYPE "BankStatementFormat" AS ENUM ('CSV', 'XLSX', 'MT940', 'CAMT053');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'BankTransactionMatchStatus') THEN
    CREATE TYPE "BankTransactionMatchStatus" AS ENUM ('UNMATCHED', 'AUTO_MATCHED', 'MANUAL_MATCHED', 'REVIEW_REQUIRED', 'IGNORED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ElectronicInvoiceProviderType') THEN
    CREATE TYPE "ElectronicInvoiceProviderType" AS ENUM ('MANUAL', 'SERBIAN_SEF');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ElectronicInvoiceStatus') THEN
    CREATE TYPE "ElectronicInvoiceStatus" AS ENUM ('PENDING', 'SENT', 'DELIVERED', 'ACKNOWLEDGED', 'REJECTED', 'FAILED', 'NOT_APPLICABLE');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'BillingJobType') THEN
    CREATE TYPE "BillingJobType" AS ENUM ('GENERATE_INVOICES', 'SEND_INVOICES', 'SEND_REMINDERS', 'PROCESS_OVERDUE', 'EXTEND_SUBSCRIPTIONS', 'SYNC_SEF', 'MATCH_PAYMENTS');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'BillingJobStatus') THEN
    CREATE TYPE "BillingJobStatus" AS ENUM ('RUNNING', 'COMPLETED', 'COMPLETED_WITH_ERRORS', 'FAILED', 'CANCELED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'BillingSequenceScope') THEN
    CREATE TYPE "BillingSequenceScope" AS ENUM ('GLOBAL_YEARLY', 'GLOBAL_MONTHLY', 'ORG_YEARLY', 'ORG_MONTHLY');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'BillingReminderType') THEN
    CREATE TYPE "BillingReminderType" AS ENUM ('PRE_DUE', 'DUE_DAY', 'POST_DUE', 'FINAL_NOTICE');
  END IF;
END $$;

-- Extend SaaSPlan ------------------------------------------------------------
ALTER TABLE "saas_plan"
  ADD COLUMN IF NOT EXISTS "quarterlyPrice"    DECIMAL(14, 2),
  ADD COLUMN IF NOT EXISTS "semiAnnualPrice"   DECIMAL(14, 2),
  ADD COLUMN IF NOT EXISTS "annualPrice"       DECIMAL(14, 2),
  ADD COLUMN IF NOT EXISTS "onboardingFee"     DECIMAL(14, 2),
  ADD COLUMN IF NOT EXISTS "publiclyAvailable" BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS "recommended"       BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "defaultTrialDays"  INT;

-- Extend OrganizationSubscription -------------------------------------------
ALTER TABLE "organization_subscription"
  ADD COLUMN IF NOT EXISTS "billingCycle"       "BillingCycle" NOT NULL DEFAULT 'MONTHLY',
  ADD COLUMN IF NOT EXISTS "paymentMethod"      "BillingPaymentMethod" NOT NULL DEFAULT 'BANK_TRANSFER',
  ADD COLUMN IF NOT EXISTS "price"              DECIMAL(14, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "currency"           TEXT NOT NULL DEFAULT 'EUR',
  ADD COLUMN IF NOT EXISTS "customPrice"        BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "customInvoiceNote"  TEXT,
  ADD COLUMN IF NOT EXISTS "trialStartsAt"      TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "currentPeriodStart" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "currentPeriodEnd"   TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "nextBillingDate"    TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "gracePeriodEndsAt"  TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "restrictedAt"       TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "suspendedAt"        TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "canceledAt"         TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "cancelAtPeriodEnd"  BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "autoRenew"          BOOLEAN NOT NULL DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS "organization_subscription_nextBillingDate_idx"
  ON "organization_subscription" ("nextBillingDate");

-- GlobalBillingSettings ------------------------------------------------------
CREATE TABLE IF NOT EXISTS "global_billing_settings" (
  "id"                                TEXT PRIMARY KEY,
  "active"                            BOOLEAN NOT NULL DEFAULT TRUE,
  "billingEnabled"                    BOOLEAN NOT NULL DEFAULT TRUE,
  "autoGenerateInvoicesEnabled"       BOOLEAN NOT NULL DEFAULT TRUE,
  "autoSendInvoicesEnabled"           BOOLEAN NOT NULL DEFAULT TRUE,
  "autoRemindersEnabled"              BOOLEAN NOT NULL DEFAULT TRUE,
  "autoOverdueEnabled"                BOOLEAN NOT NULL DEFAULT TRUE,
  "autoExtendSubscriptions"           BOOLEAN NOT NULL DEFAULT TRUE,
  "autoRestrictAccessEnabled"         BOOLEAN NOT NULL DEFAULT TRUE,
  "autoSuspendEnabled"                BOOLEAN NOT NULL DEFAULT FALSE,
  "requireManualConfirmation"         BOOLEAN NOT NULL DEFAULT FALSE,
  "defaultCurrency"                   TEXT NOT NULL DEFAULT 'EUR',
  "defaultBillingCycle"               "BillingCycle" NOT NULL DEFAULT 'MONTHLY',
  "defaultTrialDays"                  INT NOT NULL DEFAULT 14,
  "defaultGracePeriodDays"            INT NOT NULL DEFAULT 7,
  "defaultDueInDays"                  INT NOT NULL DEFAULT 15,
  "restrictedAfterDays"               INT NOT NULL DEFAULT 15,
  "suspendedAfterDays"                INT NOT NULL DEFAULT 45,
  "invoiceNumberFormat"               TEXT NOT NULL DEFAULT 'PD-{YYYY}-{SEQ:6}',
  "invoiceNumberScope"                "BillingSequenceScope" NOT NULL DEFAULT 'GLOBAL_YEARLY',
  "invoiceLocaleTag"                  TEXT NOT NULL DEFAULT 'sr-Latn-RS',
  "invoiceFooterNote"                 TEXT,
  "ipsQrEnabled"                      BOOLEAN NOT NULL DEFAULT TRUE,
  "electronicInvoiceEnabled"          BOOLEAN NOT NULL DEFAULT FALSE,
  "electronicInvoiceProvider"         "ElectronicInvoiceProviderType" NOT NULL DEFAULT 'MANUAL',
  "reminderSchedule"                  JSONB NOT NULL DEFAULT '[]',
  "restrictedModeAllowedPermissions"  JSONB NOT NULL DEFAULT '[]',
  "createdAt"                         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"                         TIMESTAMP(3) NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "global_billing_settings_active_unique"
  ON "global_billing_settings" ("active");

-- OrganizationBillingSettings -----------------------------------------------
CREATE TABLE IF NOT EXISTS "organization_billing_settings" (
  "id"                                TEXT PRIMARY KEY,
  "organizationId"                    TEXT NOT NULL,
  "mode"                              "BillingSettingsMode" NOT NULL DEFAULT 'USE_GLOBAL_SETTINGS',
  "billingEnabled"                    BOOLEAN,
  "autoGenerateInvoicesEnabled"       BOOLEAN,
  "autoSendInvoicesEnabled"           BOOLEAN,
  "autoRemindersEnabled"              BOOLEAN,
  "autoOverdueEnabled"                BOOLEAN,
  "autoExtendSubscriptions"           BOOLEAN,
  "autoRestrictAccessEnabled"         BOOLEAN,
  "autoSuspendEnabled"                BOOLEAN,
  "gracePeriodDays"                   INT,
  "dueInDays"                         INT,
  "restrictedAfterDays"               INT,
  "suspendedAfterDays"                INT,
  "reminderSchedule"                  JSONB,
  "invoiceFooterNote"                 TEXT,
  "ipsQrEnabled"                      BOOLEAN,
  "electronicInvoiceEnabled"          BOOLEAN,
  "electronicInvoiceProvider"         "ElectronicInvoiceProviderType",
  "createdAt"                         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"                         TIMESTAMP(3) NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "organization_billing_settings_organizationId_key"
  ON "organization_billing_settings" ("organizationId");

ALTER TABLE "organization_billing_settings"
  ADD CONSTRAINT "organization_billing_settings_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CompanyBillingProfile -----------------------------------------------------
CREATE TABLE IF NOT EXISTS "company_billing_profile" (
  "id"                    TEXT PRIMARY KEY,
  "active"                BOOLEAN NOT NULL DEFAULT TRUE,
  "legalName"             TEXT NOT NULL,
  "tradeName"             TEXT,
  "taxNumber"             TEXT NOT NULL,
  "registrationNumber"    TEXT,
  "vatId"                 TEXT,
  "vatRegistered"         BOOLEAN NOT NULL DEFAULT FALSE,
  "addressLine1"          TEXT NOT NULL,
  "addressLine2"          TEXT,
  "city"                  TEXT NOT NULL,
  "postalCode"            TEXT NOT NULL,
  "country"               TEXT NOT NULL DEFAULT 'RS',
  "email"                 TEXT,
  "phone"                 TEXT,
  "website"               TEXT,
  "logoStorageKey"        TEXT,
  "sefEnvironment"        "SefEnvironment" NOT NULL DEFAULT 'DISABLED',
  "sefApiKeyEncrypted"    TEXT,
  "sefEndpointUrl"        TEXT,
  "invoiceNote"           TEXT,
  "createdAt"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"             TIMESTAMP(3) NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "company_billing_profile_active_unique"
  ON "company_billing_profile" ("active");

-- BillingBankAccount --------------------------------------------------------
CREATE TABLE IF NOT EXISTS "billing_bank_account" (
  "id"            TEXT PRIMARY KEY,
  "bankName"      TEXT NOT NULL,
  "accountNumber" TEXT NOT NULL,
  "iban"          TEXT,
  "swiftBic"      TEXT,
  "currency"      TEXT NOT NULL,
  "holderName"    TEXT,
  "isDefault"     BOOLEAN NOT NULL DEFAULT FALSE,
  "isActive"      BOOLEAN NOT NULL DEFAULT TRUE,
  "sortOrder"     INT NOT NULL DEFAULT 0,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL
);

CREATE INDEX IF NOT EXISTS "billing_bank_account_currency_isActive_idx"
  ON "billing_bank_account" ("currency", "isActive");

CREATE UNIQUE INDEX IF NOT EXISTS "billing_bank_account_default_per_currency_unique"
  ON "billing_bank_account" ("currency")
  WHERE "isDefault" = TRUE AND "isActive" = TRUE;

-- BillingSequence ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "billing_sequence" (
  "id"             TEXT PRIMARY KEY,
  "organizationId" TEXT,
  "scope"          "BillingSequenceScope" NOT NULL,
  "year"           INT NOT NULL,
  "month"          INT,
  "nextValue"      INT NOT NULL DEFAULT 1,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL
);

-- Composite uniqueness. `NULLS NOT DISTINCT` (Postgres 15+) is required so
-- that GLOBAL_YEARLY (organizationId = NULL, month = NULL) rows stay
-- singletons per (scope, year). Under the default NULLS DISTINCT semantics
-- Postgres would allow multiple rows with the same non-NULL keys but
-- different NULLs, defeating the point of the constraint.
CREATE UNIQUE INDEX IF NOT EXISTS "billing_sequence_scope_org_year_month_unique"
  ON "billing_sequence" ("scope", "organizationId", "year", "month")
  NULLS NOT DISTINCT;

ALTER TABLE "billing_sequence"
  ADD CONSTRAINT "billing_sequence_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Invoice --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "invoice" (
  "id"                    TEXT PRIMARY KEY,
  "organizationId"        TEXT NOT NULL,
  "subscriptionId"        TEXT,
  "planId"                TEXT,
  "bankAccountId"         TEXT,
  "invoiceNumber"         TEXT NOT NULL,
  "status"                "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
  "source"                "InvoiceSource" NOT NULL DEFAULT 'AUTOMATIC',
  "currency"              TEXT NOT NULL,
  "subtotal"              DECIMAL(14, 2) NOT NULL,
  "taxAmount"             DECIMAL(14, 2) NOT NULL DEFAULT 0,
  "totalAmount"           DECIMAL(14, 2) NOT NULL,
  "amountPaid"            DECIMAL(14, 2) NOT NULL DEFAULT 0,
  "amountDue"             DECIMAL(14, 2) NOT NULL,
  "issueDate"             TIMESTAMP(3),
  "dueDate"               TIMESTAMP(3),
  "paidAt"                TIMESTAMP(3),
  "sentAt"                TIMESTAMP(3),
  "canceledAt"            TIMESTAMP(3),
  "servicePeriodStart"    TIMESTAMP(3),
  "servicePeriodEnd"      TIMESTAMP(3),
  "billingCycle"          "BillingCycle",
  "language"              TEXT NOT NULL DEFAULT 'sr-Latn-RS',
  "note"                  TEXT,
  "internalNote"          TEXT,
  "ipsQrPayload"          TEXT,
  "issuerSnapshot"        JSONB NOT NULL,
  "customerSnapshot"      JSONB NOT NULL,
  "bankAccountSnapshot"   JSONB,
  "pdfStorageKey"         TEXT,
  "ipsQrStorageKey"       TEXT,
  "createdByUserId"       TEXT,
  "issuedByUserId"        TEXT,
  "createdAt"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"             TIMESTAMP(3) NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "invoice_invoiceNumber_key" ON "invoice" ("invoiceNumber");
CREATE INDEX IF NOT EXISTS "invoice_organizationId_status_idx" ON "invoice" ("organizationId", "status");
CREATE INDEX IF NOT EXISTS "invoice_status_dueDate_idx" ON "invoice" ("status", "dueDate");
CREATE INDEX IF NOT EXISTS "invoice_subscriptionId_idx" ON "invoice" ("subscriptionId");

-- Idempotency: no more than one active automatic invoice per subscription
-- for a given service period start.
CREATE UNIQUE INDEX IF NOT EXISTS "invoice_subscription_period_automatic_unique"
  ON "invoice" ("subscriptionId", "servicePeriodStart")
  WHERE "source" = 'AUTOMATIC' AND "status" NOT IN ('CANCELED', 'VOID');

ALTER TABLE "invoice"
  ADD CONSTRAINT "invoice_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "invoice_subscriptionId_fkey"
    FOREIGN KEY ("subscriptionId") REFERENCES "organization_subscription" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "invoice_planId_fkey"
    FOREIGN KEY ("planId") REFERENCES "saas_plan" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "invoice_bankAccountId_fkey"
    FOREIGN KEY ("bankAccountId") REFERENCES "billing_bank_account" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "invoice_createdByUserId_fkey"
    FOREIGN KEY ("createdByUserId") REFERENCES "user" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "invoice_issuedByUserId_fkey"
    FOREIGN KEY ("issuedByUserId") REFERENCES "user" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- InvoiceItem ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "invoice_item" (
  "id"          TEXT PRIMARY KEY,
  "invoiceId"   TEXT NOT NULL,
  "type"        "InvoiceItemType" NOT NULL DEFAULT 'SUBSCRIPTION',
  "description" TEXT NOT NULL,
  "quantity"    DECIMAL(14, 4) NOT NULL DEFAULT 1,
  "unitPrice"   DECIMAL(14, 2) NOT NULL,
  "taxRate"     DECIMAL(6, 3) NOT NULL DEFAULT 0,
  "amount"      DECIMAL(14, 2) NOT NULL,
  "currency"    TEXT NOT NULL,
  "sortOrder"   INT NOT NULL DEFAULT 0,
  "metadata"    JSONB
);

CREATE INDEX IF NOT EXISTS "invoice_item_invoiceId_idx" ON "invoice_item" ("invoiceId");

ALTER TABLE "invoice_item"
  ADD CONSTRAINT "invoice_item_invoiceId_fkey"
  FOREIGN KEY ("invoiceId") REFERENCES "invoice" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- BankStatementImport --------------------------------------------------------
CREATE TABLE IF NOT EXISTS "bank_statement_import" (
  "id"                TEXT PRIMARY KEY,
  "organizationId"    TEXT,
  "format"            "BankStatementFormat" NOT NULL,
  "fileName"          TEXT NOT NULL,
  "storageKey"        TEXT NOT NULL,
  "status"            "BankStatementImportStatus" NOT NULL DEFAULT 'PENDING',
  "totalTransactions" INT NOT NULL DEFAULT 0,
  "matchedCount"      INT NOT NULL DEFAULT 0,
  "unmatchedCount"    INT NOT NULL DEFAULT 0,
  "errorCount"        INT NOT NULL DEFAULT 0,
  "errorMessage"      TEXT,
  "uploadedByUserId"  TEXT,
  "processedAt"       TIMESTAMP(3),
  "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "bank_statement_import_status_idx" ON "bank_statement_import" ("status");

ALTER TABLE "bank_statement_import"
  ADD CONSTRAINT "bank_statement_import_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organization" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "bank_statement_import_uploadedByUserId_fkey"
    FOREIGN KEY ("uploadedByUserId") REFERENCES "user" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- BankStatementTransaction --------------------------------------------------
CREATE TABLE IF NOT EXISTS "bank_statement_transaction" (
  "id"               TEXT PRIMARY KEY,
  "importId"         TEXT NOT NULL,
  "organizationId"   TEXT,
  "matchedInvoiceId" TEXT,
  "transactionDate"  TIMESTAMP(3) NOT NULL,
  "valueDate"        TIMESTAMP(3),
  "amount"           DECIMAL(14, 2) NOT NULL,
  "currency"         TEXT NOT NULL,
  "counterpartyName" TEXT,
  "counterpartyIban" TEXT,
  "counterpartyRef"  TEXT,
  "reference"        TEXT,
  "narrative"        TEXT,
  "externalId"       TEXT,
  "matchStatus"      "BankTransactionMatchStatus" NOT NULL DEFAULT 'UNMATCHED',
  "matchConfidence"  INT NOT NULL DEFAULT 0,
  "matchNotes"       TEXT,
  "reviewedByUserId" TEXT,
  "reviewedAt"       TIMESTAMP(3),
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"        TIMESTAMP(3) NOT NULL
);

CREATE INDEX IF NOT EXISTS "bank_statement_transaction_importId_idx"      ON "bank_statement_transaction" ("importId");
CREATE INDEX IF NOT EXISTS "bank_statement_transaction_matchStatus_idx"   ON "bank_statement_transaction" ("matchStatus");
CREATE INDEX IF NOT EXISTS "bank_statement_transaction_organizationId_idx" ON "bank_statement_transaction" ("organizationId");

ALTER TABLE "bank_statement_transaction"
  ADD CONSTRAINT "bank_statement_transaction_importId_fkey"
    FOREIGN KEY ("importId") REFERENCES "bank_statement_import" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "bank_statement_transaction_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organization" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "bank_statement_transaction_reviewedByUserId_fkey"
    FOREIGN KEY ("reviewedByUserId") REFERENCES "user" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- SubscriptionPayment --------------------------------------------------------
CREATE TABLE IF NOT EXISTS "subscription_payment" (
  "id"                        TEXT PRIMARY KEY,
  "organizationId"            TEXT NOT NULL,
  "subscriptionId"            TEXT,
  "provider"                  "SubscriptionPaymentProvider" NOT NULL DEFAULT 'MANUAL',
  "status"                    "SubscriptionPaymentStatus" NOT NULL DEFAULT 'COMPLETED',
  "amount"                    DECIMAL(14, 2) NOT NULL,
  "currency"                  TEXT NOT NULL,
  "paidAt"                    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "providerTransactionId"     TEXT,
  "bankStatementTransactionId" TEXT,
  "reference"                 TEXT,
  "note"                      TEXT,
  "reversedAt"                TIMESTAMP(3),
  "reversalReason"            TEXT,
  "reversedByUserId"          TEXT,
  "createdByUserId"           TEXT,
  "createdAt"                 TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"                 TIMESTAMP(3) NOT NULL
);

CREATE INDEX IF NOT EXISTS "subscription_payment_organizationId_status_idx"
  ON "subscription_payment" ("organizationId", "status");
CREATE INDEX IF NOT EXISTS "subscription_payment_bankStatementTransactionId_idx"
  ON "subscription_payment" ("bankStatementTransactionId");

ALTER TABLE "subscription_payment"
  ADD CONSTRAINT "subscription_payment_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "subscription_payment_subscriptionId_fkey"
    FOREIGN KEY ("subscriptionId") REFERENCES "organization_subscription" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "subscription_payment_bankStatementTransactionId_fkey"
    FOREIGN KEY ("bankStatementTransactionId") REFERENCES "bank_statement_transaction" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "subscription_payment_reversedByUserId_fkey"
    FOREIGN KEY ("reversedByUserId") REFERENCES "user" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "subscription_payment_createdByUserId_fkey"
    FOREIGN KEY ("createdByUserId") REFERENCES "user" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- PaymentAllocation ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS "payment_allocation" (
  "id"                    TEXT PRIMARY KEY,
  "subscriptionPaymentId" TEXT NOT NULL,
  "invoiceId"             TEXT NOT NULL,
  "amount"                DECIMAL(14, 2) NOT NULL,
  "currency"              TEXT NOT NULL,
  "createdAt"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "payment_allocation_payment_invoice_unique"
  ON "payment_allocation" ("subscriptionPaymentId", "invoiceId");

CREATE INDEX IF NOT EXISTS "payment_allocation_invoiceId_idx" ON "payment_allocation" ("invoiceId");

ALTER TABLE "payment_allocation"
  ADD CONSTRAINT "payment_allocation_subscriptionPaymentId_fkey"
    FOREIGN KEY ("subscriptionPaymentId") REFERENCES "subscription_payment" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "payment_allocation_invoiceId_fkey"
    FOREIGN KEY ("invoiceId") REFERENCES "invoice" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- SubscriptionExtension -----------------------------------------------------
CREATE TABLE IF NOT EXISTS "subscription_extension" (
  "id"             TEXT PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "subscriptionId" TEXT NOT NULL,
  "invoiceId"      TEXT NOT NULL,
  "extendedFrom"   TIMESTAMP(3) NOT NULL,
  "extendedTo"     TIMESTAMP(3) NOT NULL,
  "cycle"          "BillingCycle" NOT NULL,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "subscription_extension_subscription_invoice_unique"
  ON "subscription_extension" ("subscriptionId", "invoiceId");
CREATE INDEX IF NOT EXISTS "subscription_extension_organizationId_idx"
  ON "subscription_extension" ("organizationId");

ALTER TABLE "subscription_extension"
  ADD CONSTRAINT "subscription_extension_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "subscription_extension_subscriptionId_fkey"
    FOREIGN KEY ("subscriptionId") REFERENCES "organization_subscription" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "subscription_extension_invoiceId_fkey"
    FOREIGN KEY ("invoiceId") REFERENCES "invoice" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ElectronicInvoiceRecord ---------------------------------------------------
CREATE TABLE IF NOT EXISTS "electronic_invoice_record" (
  "id"                    TEXT PRIMARY KEY,
  "organizationId"        TEXT NOT NULL,
  "invoiceId"             TEXT NOT NULL,
  "provider"              "ElectronicInvoiceProviderType" NOT NULL,
  "status"                "ElectronicInvoiceStatus" NOT NULL DEFAULT 'PENDING',
  "providerReference"     TEXT,
  "providerStatusCode"    TEXT,
  "providerStatusMessage" TEXT,
  "sentAt"                TIMESTAMP(3),
  "lastSyncAt"            TIMESTAMP(3),
  "attempts"              INT NOT NULL DEFAULT 0,
  "errorMessage"          TEXT,
  "payload"               JSONB,
  "responsePayload"       JSONB,
  "createdAt"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"             TIMESTAMP(3) NOT NULL
);

CREATE INDEX IF NOT EXISTS "electronic_invoice_record_organizationId_status_idx"
  ON "electronic_invoice_record" ("organizationId", "status");
CREATE INDEX IF NOT EXISTS "electronic_invoice_record_invoiceId_idx"
  ON "electronic_invoice_record" ("invoiceId");

ALTER TABLE "electronic_invoice_record"
  ADD CONSTRAINT "electronic_invoice_record_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "electronic_invoice_record_invoiceId_fkey"
    FOREIGN KEY ("invoiceId") REFERENCES "invoice" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- BillingJobRun -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "billing_job_run" (
  "id"                TEXT PRIMARY KEY,
  "jobType"           "BillingJobType" NOT NULL,
  "status"            "BillingJobStatus" NOT NULL DEFAULT 'RUNNING',
  "triggeredBy"       TEXT NOT NULL,
  "triggeredByUserId" TEXT,
  "processedCount"    INT NOT NULL DEFAULT 0,
  "successCount"      INT NOT NULL DEFAULT 0,
  "errorCount"        INT NOT NULL DEFAULT 0,
  "skippedCount"      INT NOT NULL DEFAULT 0,
  "startedAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finishedAt"        TIMESTAMP(3),
  "durationMs"        INT,
  "summary"           JSONB,
  "errorMessage"      TEXT
);

CREATE INDEX IF NOT EXISTS "billing_job_run_jobType_startedAt_idx" ON "billing_job_run" ("jobType", "startedAt");
CREATE INDEX IF NOT EXISTS "billing_job_run_status_idx" ON "billing_job_run" ("status");

-- Only one RUNNING row per job type at a time — enforces cron singleton lock.
CREATE UNIQUE INDEX IF NOT EXISTS "billing_job_run_type_running_unique"
  ON "billing_job_run" ("jobType")
  WHERE "status" = 'RUNNING';

ALTER TABLE "billing_job_run"
  ADD CONSTRAINT "billing_job_run_triggeredByUserId_fkey"
  FOREIGN KEY ("triggeredByUserId") REFERENCES "user" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- BillingEmailTemplate ------------------------------------------------------
CREATE TABLE IF NOT EXISTS "billing_email_template" (
  "id"          TEXT PRIMARY KEY,
  "key"         TEXT NOT NULL,
  "name"        TEXT NOT NULL,
  "description" TEXT,
  "subject"     TEXT NOT NULL,
  "bodyHtml"    TEXT NOT NULL,
  "bodyText"    TEXT NOT NULL,
  "locale"      TEXT NOT NULL DEFAULT 'sr-Latn-RS',
  "variables"   JSONB NOT NULL DEFAULT '[]',
  "active"      BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "billing_email_template_key_key" ON "billing_email_template" ("key");
