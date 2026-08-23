# projects

Investor-side real-estate construction projects.

Route: `/projekti` — list, create, edit, and drill into a project's
inventory and structure. Detail also embeds the shared photo gallery
and the Leaflet-based project map (see `src/features/projects/project-map.tsx`).

Data model: `Project` in [`prisma/schema.prisma`](../../../prisma/schema.prisma)
plus its structure (`Building`, `Entrance`, `Floor`) and coordinate
fields (`latitude`, `longitude`, `coverImageUrl`). Photo gallery uses
the shared `Document` model with `sortOrder` / `isCover`.

Key components:

- `new-project-drawer.tsx` — create flow as a right-side panel
  (full-screen on mobile). `/projekti/novi` stays as a deep-link page.
- `projects-filter-bar.tsx` — live search/status filters (URL + RSC).
- `new-project-form.tsx` — create/edit form. City, address, and
  municipality use [`location-fields.tsx`](./location-fields.tsx)
  (`SuggestInput` → `GET /api/v1/geo/suggest`). Picking a place
  fills postal code and lat/lng via `GET /api/v1/geo/geocode`
  ([`src/lib/geo/serbia.ts`](../../lib/geo/serbia.ts)).
- `cover-image-field.tsx` — cover upload to S3
  (`POST /api/v1/projects/cover`). Public preview:
  `GET /api/v1/public/project-cover/[documentId]`.
- `project-map.tsx` — Leaflet + OSM map, dynamically imported with
  `ssr: false` because Leaflet touches `window`.
- `structure-manager.tsx` — Building/Entrance/Floor CRUD. Each floor
  label links to `/spratovi/[id]`, the interactive floor-plan viewer.
