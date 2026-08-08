# crm

Buyers, activities, tasks — the leads and follow-up side of
PropertyDesk.

Routes:

- `/kupci` and `/kupci/[id]` — buyer list and detail. Detail embeds
  `BuyerQuickActions` (call / email / WhatsApp / Viber built on
  `normalizePhone`), an activity timeline, and the threaded
  `CommentThread` panel with `@mentions`.
- `/zadaci` — task list. Task due dates surface in `/kalendar`.
- `/kupci/novi`, `/kupci/[id]/izmena` — CRUD forms.

Duplicate detection runs per organization on normalized phone/email
so cosmetic differences don't create duplicate buyers.
