# Billing architecture

## Goals

- Multi-tenant SaaS billing for Serbian legal entities (dinar + EUR).
- Fully automated on the happy path; every step overridable by super-admin.
- Idempotent by construction — retrying a job or a payment never
  double-charges, double-issues, or double-transitions.
- Audit trail on every mutation that touches money, access, or state.

## Layered module map

```
apps
 └─ src/app/(dashboard)/administracija/naplata/     ← platform admin UI
 └─ src/app/(dashboard)/podesavanja/{pretplata,fakture}/ ← tenant UI
 └─ src/app/api/v1/billing/                          ← REST + server actions

domain
 └─ src/server/services/billing/
     ├─ settings/            resolver, global CRUD, per-org CRUD
     ├─ subscriptions.service.ts
     ├─ invoices/            CRUD, numbering, generation, PDF
     ├─ payments/            allocation math + reversal
     ├─ overdue/             PAYMENT_DUE → SUSPENDED transitions
     ├─ reminders/           templated multi-stage reminders
     ├─ bank-statement/      CSV/XLSX parser + 5-signal matcher
     ├─ electronic-invoice/  provider abstraction + Serbian SEF stub
     ├─ ips-qr/              NBS QR payload generator
     ├─ emails/              14 Serbian templates + renderer
     └─ jobs/                7 registered cron jobs + BillingJobRun runner

infra
 └─ src/server/db/prisma.ts
 └─ src/server/security/secrets.ts (AES-256-GCM)
 └─ src/server/logger.ts
 └─ prisma/schema.prisma + prisma/migrations/*
```

The **UI never talks to Prisma directly**. Every mutation goes through a
domain service, which owns the transaction boundary and the audit call.

## Concurrency & idempotency

Two mechanisms give us the "never double-charge" guarantee:

1. **Postgres partial unique indexes** on
   - `Invoice(subscriptionId, servicePeriodStart)` `WHERE source = 'AUTOMATIC'`
   - `BillingJobRun(type)` `WHERE status = 'RUNNING'`
   - `BillingSequence(scope, organizationId, year, month)` `NULLS NOT DISTINCT`
2. **Advisory locks** in `allocateInvoiceNumber` — `pg_advisory_xact_lock`
   over the hashed sequence key, so racing allocators serialize on the
   sequence row rather than fighting over the SELECT-FOR-UPDATE.

Every job also acquires a row-level lock via `BillingJobRun`: if a run of
the same type is already in `RUNNING`, the second attempt fails fast with
a P2002 and reports "already running" rather than double-processing.

## State machines

| Entity | States |
| --- | --- |
| `OrganizationSubscription` | `TRIAL → ACTIVE → PAYMENT_DUE → PAST_DUE → RESTRICTED → SUSPENDED / CANCELED / EXPIRED` |
| `Invoice` | `DRAFT → ISSUED → SENT → PARTIALLY_PAID → PAID` (or `OVERDUE → CANCELED / VOID`) |
| `SubscriptionPayment` | `PENDING → COMPLETED / FAILED / REFUNDED` (with `REVERSED` for reversal) |
| `BankTransactionMatch` | `UNMATCHED → AUTO_MATCHED / REVIEW_REQUIRED → MATCHED / IGNORED` |
| `ElectronicInvoiceRecord` | `PENDING → SENT → ACKNOWLEDGED / REJECTED / CANCELED` |

Every documented transition has an audit action defined in
[`audit.ts`](../../src/server/audit/audit.ts).

## Money handling

- All monetary columns use Postgres `NUMERIC(14, 2)`.
- The application never uses JavaScript `number` for money; every operation
  goes through `Prisma.Decimal` (or the app's `toDecimal` helper).
- Currencies are stored as ISO 4217 strings alongside every amount; the
  allocator refuses to combine invoices in different currencies.

## Testability

Pure functions (numbering, IPS QR builder, allocation math, reminder
stage picker, cycle math) have dedicated Vitest suites and do not touch
the DB. Higher-level services are exercised via the seed script and manual
QA against the local Postgres instance.
