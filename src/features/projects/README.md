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

- `new-project-form.tsx` — create/edit form with coordinate picker.
- `project-map.tsx` — Leaflet + OSM map, dynamically imported with
  `ssr: false` because Leaflet touches `window`.
- `structure-manager.tsx` — Building/Entrance/Floor CRUD. Each floor
  label links to `/spratovi/[id]`, the interactive floor-plan viewer.
