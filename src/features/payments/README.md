# payments

Installment plans and incoming payments.

Placeholder routes: `/payment-plans`, `/payments`

Planned:

- PaymentPlan with schedule rows (dueOn, amount, currency).
- Payment records against a plan row.
- Decimal-safe running totals via `formatMoney` + `sumMoney`.
