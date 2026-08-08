# sales

The transaction-critical core of PropertyDesk — every sale ties a
buyer, a unit, and a payment plan together.

Routes:

- `/prodaje` — list view *and* Kanban board (`?view=board`) with
  drag-and-drop between allowed FSM states. `PAYMENT_IN_PROGRESS` is
  a read-only column because the status is derived from payments.
- `/prodaje/[id]` — full detail: payments, commission snapshot,
  status history, threaded comments with @mentions.
- `/prodaje/nova?reservation=…` — convert an approved reservation
  into a sale (invoked from the Kanban `CONVERTED` drop as well).
- `/prodaje/[id]/plan-placanja` — payment plan editor.

Service: `src/server/services/sales/sales.service.ts`. Invariants are
documented in the file header; the short version is:

- At most one non-canceled sale per unit (partial unique index +
  transactional precheck + FSM).
- Decimal-safe money everywhere via `src/lib/formatters/money.ts`.
- Every status change bumps `version` and appends a
  `SaleStatusHistory` row.
- Contracting snapshots the applicable `AgencyCommissionRule` into a
  new `Commission` row — later rule changes never mutate existing
  sales.
