# Public project microsite (Faza 8.3 C1)

Opt-in, per-project public site under the marketing route
`/p/projekat/[slug]`. Investors flip the toggle on the project edit
form, pick a slug (or reuse the internal one), and the page becomes
crawlable. Available units surface with photos, floor plans (when
uploaded), price (optional), and a call-to-action that opens the
existing `/p/[token]` share-link form for online reservation.

## Data model

Two nullable columns on `Project`:

- `publicMicrositeEnabled: boolean` — hard on/off.
- `publicMicrositeSlug: string?` — unique. When null, the resolver
  falls back to the project's own `slug`, which is also unique per
  organisation. This keeps a two-tier setup (internal short slug vs
  public marketing slug) simple.

Public units come from the same visibility flag agencies see —
`Unit.isVisibleToAgencies = true` — so an investor doesn't have to
manage a separate "public catalogue" toggle.

## Route

- `/p/projekat/[slug]` — server-rendered public shell. Data is
  resolved by
  [`resolvePublicProjectSite`](../src/server/services/sharing/share-links.service.ts).
- 404 when the slug does not match, the project is archived, or
  `publicMicrositeEnabled = false` **and** the visitor has no valid
  agency referral for that project (see below).

The microsite intentionally lives under the marketing site tree, not
the app dashboard shell. It should look like a landing page, not a
CRM.

## Sections rendered

1. **Hero** — project name, city, cover image (`Project.coverImageUrl`,
   uploaded on the project form to S3 and served at
   `/api/v1/public/project-cover/:documentId`), sales-start date,
   expected completion, ProjectStatus badge. City / address come from
   the Serbia suggest + geocode fields on the project form.
2. **Available units** — grid of `Unit`s (see filter below) with
   photos (cover from Documents), type, area, price (if
   `publishPricesOnMicrosite = true` — currently derived from
   `defaultCurrency` presence), status badge, and a "Rezerviši
   online" button that opens the unit's active `ShareLink`.
3. **Map** — Leaflet embed pinned at `Project.latitude/longitude`
   when present.
4. **Contact** — investor legal name + contact email from
   `OrganizationProfile`. No phone by default (avoid exposing a
   personal mobile publicly).
5. **Footer** — required disclaimers ("Nije javna ponuda u smislu
   ZOO", "Cene su okvirne dok se ne potpiše ugovor", GDPR privacy
   link).

## Unit filter

`Unit.isVisibleToAgencies = true`
`AND Unit.status IN ('AVAILABLE', 'RESERVED')`
`AND Unit.archivedAt IS NULL`
`AND Project.organizationId = <owner>`

Sold units are hidden — a public microsite that shows "0 dostupnih
jedinica" is honest and doesn't tempt visitors with unavailable
stock.

## Sharing individual units

Each unit tile links to `/p/[token]` — the existing anonymous share
page — so the *actual* offer + reservation form logic doesn't fork.
When the operator hasn't created a share link for a unit yet, the
microsite auto-creates one (`ShareLink { entityType: 'unit',
entityId, showPrice: true, expiresAt: null }`) on first request,
using the current session as `createdByUserId = <organizer of the
project>`. This keeps the page usable without operator setup.

## Referral integration

Agency **Ponuda** copies `/p/r/<code>` (public catalog, no login).
That page links here with `?ref=<code>`. See
[`docs/referral.md`](./referral.md).

On this page:

- `?ref=<code>` or cookie `pd_ref` (30 days, `SameSite=Lax`) unlocks
  the microsite even when `publicMicrositeEnabled` is off, if the
  code belongs to an ACTIVE connection with ACTIVE project access.
- Unit tiles keep `?ref=` on `/p/<token>` so the reservation form
  stamps `ReservationRequest.referralCode`.

## Access control

- No authentication.
- Rate limit: 60 GET / minute / IP through the shared
  `publicSurfaceLimiter`.
- Bot detection is intentionally *off* on a published microsite.
  `/p/r/<code>` and unpublished slugs opened only via referral stay
  `noindex`.

## Testing

Manual smoke:

1. Enable the microsite on a demo project, or use an agency referral
   code that has access to the project.
2. `curl -I https://<host>/p/projekat/<slug>` → 200 when published.
3. Visit `/p/r/<code>` — catalog or redirect, no sign-in. Cookie
   `pd_ref` is set.
4. Submit the reservation form — verify
   `ReservationRequest.referralCode` matches.

Automated: `src/server/services/agencies/referral-catalog.service.test.ts`
covers catalog resolution and referral unlock.
