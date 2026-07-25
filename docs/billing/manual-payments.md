# Manual payments

Super-admin (and organization owners for their own tenant) can record a
payment against an invoice manually — e.g. after a bank confirmation
comes in over WhatsApp, or when reconciling a legacy invoice.

## Recording a payment

Endpoint: `POST /api/v1/billing/invoices/{invoiceId}/payments`

Request:

```json
{
  "amount": "150.00",
  "currency": "RSD",
  "method": "BANK_TRANSFER",
  "paidAt": "2026-07-17",
  "reference": "97 1234567890",
  "note": "Uplata sa računa 160-1234567890-56"
}
```

The service:

1. Creates a `SubscriptionPayment` in `PENDING`.
2. Computes FIFO allocations across the target invoice (and, optionally,
   other open invoices for the same subscription).
3. Applies allocations inside a single transaction.
4. Advances the payment to `COMPLETED`.
5. Emits `billing.payment_recorded` audit.

## Splitting a single payment across multiple invoices

Pass an explicit `allocations` array instead of a single `invoiceId`.
Each entry must reference an invoice on the same subscription and use the
same currency. `computeFifoAllocations` guarantees the plan is
deterministic and never over-allocates.

## Overpayments

If the incoming amount exceeds all open invoices, the leftover is kept as
`unappliedAmount` on the payment. It is _not_ auto-attributed to future
invoices — an operator must apply it manually. This mirrors what a
Serbian accounting workflow expects.

## Reversal

A completed payment can be reversed by a super-admin. Reversal is _not_
deletion:

- Original payment stays; a new `SubscriptionPayment` with
  `status = 'REVERSED'` and negative allocations is written.
- Invoice `amountPaid` / `amountDue` / `status` are recomputed from
  scratch (never trusted from cache).
- Audit: `billing.payment_reversed`.

## Sequencing with automation

Manual mutations are safe to run against subscriptions currently in a
transition (e.g. RESTRICTED). Recording a payment does not automatically
reactivate the tenant — the operator explicitly reactivates. This is a
policy decision: it forces a human confirmation that the amount is real
before customer access is restored.
