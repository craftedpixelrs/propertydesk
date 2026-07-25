# Invoice lifecycle

## States

```
DRAFT ──issue──▶ ISSUED ──send──▶ SENT
                    │              │
                    ├──partial────▶ PARTIALLY_PAID
                    │
                    ├──full───────▶ PAID
                    │
                    ├──due passed─▶ OVERDUE ─(payment)─▶ PARTIALLY_PAID | PAID
                    │
                    ├──cancel─────▶ CANCELED
                    └──void───────▶ VOID   (accounting-safe correction)
```

- `DRAFT` — mutable line items, no legal number yet.
- `ISSUED` — number allocated from `BillingSequence`, issuer snapshot
  frozen onto `Invoice.issuerSnapshot`, item lines immutable.
- `SENT` — email + in-app dispatched; distinct from ISSUED because
  operators may choose to withhold sending.
- `PAID` — `amountDue == 0`. `paidAt` captured. Subscription extension
  triggered as a side effect (see [subscription-lifecycle.md](./subscription-lifecycle.md)).
- `PARTIALLY_PAID` — one or more allocations, but `amountDue > 0`.
- `OVERDUE` — `dueDate < now()` and status was still ISSUED/SENT/PARTIALLY_PAID.
- `CANCELED` / `VOID` — never counted toward AR. VOID additionally leaves
  a corrective ledger entry (used post-issuance when correction is required).

## Numbering

Format lives in `GlobalBillingSettings.invoiceNumberFormat` (default
`PD-{YYYY}-{SEQ:6}`). Tokens: `{YYYY}`, `{YY}`, `{MM}`, `{ORG}`, `{SEQ}`,
`{SEQ:N}`. Scope options (`GLOBAL_YEARLY`, `GLOBAL_MONTHLY`, `ORG_YEARLY`,
`ORG_MONTHLY`) determine which sequence row is incremented. Allocation is
transactional and uses `pg_advisory_xact_lock` to serialize concurrent
allocators — the `invoiceNumber` UNIQUE constraint is a belt-and-braces
backup.

## Immutable snapshots

When an invoice becomes `ISSUED`, the current `CompanyBillingProfile` is
serialized to `Invoice.issuerSnapshot` as JSON. This preserves the
issuer's legal name, tax number, and address exactly as they were at
issuance — required by Serbian tax law even after the operator later
edits their profile.

## PDF generation

`renderInvoicePdf(invoice)` streams a Serbian-language PDF that includes:

- issuer snapshot,
- recipient (organization profile),
- invoice items with net/tax/total,
- IPS QR code (if the currency is RSD and `ipsQrEnabled`),
- SEF reference (if the invoice has an `ElectronicInvoiceRecord`).

The PDF is not stored on disk — it's rendered on demand and streamed via
`/api/v1/billing/invoices/{id}/pdf`, gated by `billing.invoice.read`.

## Idempotent automatic generation

`generateDueSubscriptionInvoices` inserts an `Invoice` with
`source = 'AUTOMATIC'`. The partial unique index
`invoice_subscription_period_automatic_unique` on
`(subscriptionId, servicePeriodStart) WHERE source = 'AUTOMATIC'`
guarantees that a re-run for the same period yields P2002 and the job
counts it as "already generated". Manual invoices are unaffected by the
constraint.
