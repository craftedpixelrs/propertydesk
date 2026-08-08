# inventory

Sellable units — apartments, garages, storage, and everything else the
investor puts on the market.

Route: `/jedinice` — list with rich filters, plus a detail page that
now includes a photo gallery, share-token panel, and (via
`/spratovi/[id]`) an interactive floor-plan viewer.

Data model: `Unit` in [`prisma/schema.prisma`](../../../prisma/schema.prisma).
Status transitions live in `src/server/services/units.service.ts`
(`ALLOWED_STATUS_TRANSITIONS`). Concurrency is guarded by the
`sale_unit_active_uniq` partial unique index plus the `version` column.

Related surfaces:

- `import-wizard.tsx` — Excel/CSV bulk import.
- `src/features/documents/photo-gallery.tsx` — reused by both unit and
  project detail pages.
- `src/features/sharing/unit-share-panel.tsx` — public share link CRUD.
- `src/features/floor-plan/floor-plan-viewer.tsx` — SVG polygon overlay
  keyed to the unit's current status.
