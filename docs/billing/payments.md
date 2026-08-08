# Payments (allocation math + audit)

## Data model

```
SubscriptionPayment           (money in)
├─ status: PENDING | COMPLETED | FAILED | REFUNDED | REVERSED
├─ amount, currency, method (BANK_TRANSFER | CASH | CARD | IPS_QR | OTHER)
├─ paidAt, receivedAt, reference
└─ allocations: PaymentAllocation[]

PaymentAllocation              (money-to-invoice link)
├─ subscriptionPaymentId
├─ invoiceId
├─ amount, currency
└─ (unique on (subscriptionPaymentId, invoiceId))
```

The two-row shape lets a single payment cover multiple invoices, and a
single invoice receive multiple payments. `Invoice.amountPaid` is always
`SUM(allocations WHERE invoiceId = this).amount` — recomputed transactionally
whenever an allocation is inserted or reversed.

## FIFO allocation algorithm

`computeFifoAllocations(amount, invoices, currency)`:

1. Filter `invoices` to those matching `currency`.
2. Sort by `dueDate ASC`, then `issuedAt ASC` (stable).
3. Walk the sorted list, taking `min(remaining, invoice.amountDue)` from
   each until either the payment is exhausted or the list is done.
4. Return `{ allocations, unapplied }` — the caller decides what to do
   with any leftover (`unappliedAmount` on the payment).

The function is pure and well tested (`allocation.service.test.ts`).

## Applying allocations

`applyAllocations(tx, { paymentId, allocations, ... })` runs inside an
existing transaction and enforces:

- Every invoice exists and matches the payment currency.
- Invoice is not `CANCELED` or `VOID`.
- Each allocation is strictly positive.
- No allocation exceeds the invoice's remaining `amountDue` (unless
  `allowOverpay: true`).
- Total allocations do not exceed payment amount (unless
  `allowOverpay: true`).

On success:
- Inserts `PaymentAllocation` rows.
- Updates each `Invoice.amountPaid`, `amountDue`, `status`, `paidAt`.
- Fires no audit; the caller wraps this in a domain action (e.g.
  `billing.payment_recorded`).

## Reversal

A super-admin can reverse a `COMPLETED` payment. The service:

1. Loads the payment + allocations.
2. In one transaction, for each allocation:
   - Recomputes the target invoice's `amountPaid` and `amountDue`.
   - Updates the invoice status if it drops below `PAID`.
3. Marks the payment as `REVERSED` (its allocations remain, negative for
   ledger clarity).
4. Emits `billing.payment_reversed` with the operator-supplied reason.

Reversal never deletes rows — the audit trail is a legal requirement.

## Payment methods

| Method | Notes |
| --- | --- |
| `BANK_TRANSFER` | Default for reconciling from a bank statement. |
| `IPS_QR` | Set automatically when the payment came in through an IPS QR reference. |
| `CASH` | Requires manual entry with a `note`. |
| `CARD` | Reserved for future POS integration. |
| `OTHER` | Free-form; note required. |

## Interaction with subscription

Recording a payment does _not_ automatically reactivate a RESTRICTED
tenant. The operator explicitly reactivates via the org billing tab.
See [manual-payments.md](./manual-payments.md) for the reasoning.
