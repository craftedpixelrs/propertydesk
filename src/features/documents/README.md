# documents

Uploaded files linked to projects, units, reservations, sales, buyers,
and agencies. Storage is abstracted behind `StorageProvider`
(`src/server/storage/`) so we can swap between local disk and any
S3-compatible bucket.

Route: `/dokumenti` — central repository. Documents also surface in-
line on entity detail pages:

- `photo-gallery.tsx` — grid + lightbox for `image/*` documents on
  unit and project detail pages. Reads use the `imagesOnly` filter and
  respect `Document.sortOrder` / `isCover` for ordering.
- `document-uploader.tsx` — reusable drag-and-drop uploader.

Public share tokens (`ShareLink`) reuse the same rows: the
unauthenticated `/api/public/share/[token]/image/[documentId]` route
resolves the token, verifies the document belongs to the shared unit,
and either streams it (local storage) or 302-redirects to a signed URL
(S3). Rate limits apply per token+doc pair.

Authoritative service: `src/server/services/documents.service.ts`. All
mutations are tenant-scoped, RBAC-gated, and audited.

Delete is soft (`deletedAt`). The file stays in S3/local for 45 days;
`POST /api/v1/jobs/purge-deleted-documents` then calls
`StorageProvider.delete` and sets `storagePurgedAt`. See
`src/server/services/documents-purge.service.ts`.
