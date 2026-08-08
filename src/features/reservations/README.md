# reservations

Reservation workflow — introduce a customer, hold a unit, escalate to
a sale.

Routes:

- `/rezervacije` — list *and* Kanban board (`?view=board`). Drag a
  card between allowed FSM columns; disallowed columns are dimmed
  during the drag so the mistake is prevented before the server has
  to refuse it. Dropping on `CONVERTED` redirects to `/prodaje/nova`
  because conversion requires a price.
- `/rezervacije/[id]` — detail with actions (approve/reject/cancel)
  and the full status history.

Service: `src/server/services/reservations.service.ts`. FSM lives in
`ALLOWED_RESERVATION_TRANSITIONS`; the DB partial unique index
`reservation_unit_active` guarantees at most one active reservation
per unit.

API endpoints are action-scoped (`/approve`, `/reject`, `/cancel`,
`/convert`) rather than a generic PATCH so each carries the right
permission gate and body schema.
