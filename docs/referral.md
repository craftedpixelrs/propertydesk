# Agency referral codes (Faza 8.3 C2)

Every `AgencyConnection` — the join row that links an agency
organisation to an investor organisation — can carry an 8-character
`referralCode`. The code turns a public URL into a trackable link:
who did the visitor come from, which sale should the agency get
attributed on.

## Data model

- `AgencyConnection.referralCode` — nullable, unique globally. Format
  is `[A-Z0-9]{8}` (excludes visually ambiguous chars `0`, `O`, `1`,
  `I`, `L`).
- `ReservationRequest.referralCode` — mirrored on public form submit.
- `Reservation.referralCode` — mirrored on `confirmReservationRequest`.
- Sales inherit the code from their originating reservation but
  don't store it separately (the join `sale → reservation` is enough
  for reporting).

The code is generated lazily when the agency first opens **Ponuda**
(backfill) or taps **Generiši novi kod**. A NULL code means the
connection has not adopted the referral flow yet.

## Buyer URL (do not send them to `/`)

The agency **Kopiraj link** / QR on `/ponuda` encodes:

```
https://<app-host>/p/r/<code>
```

Examples: `https://demo.propertydesk.app/p/r/PRV2WS4Q`.

`/` on `demo.`, `staging.` and `my.` always redirects to `/sign-in`.
That is for staff, not buyers. The catalog route is public.

`/p/r/<code>` (`resolveReferralCatalog`):

1. Resolves an **ACTIVE** connection with that code. Unknown, rotated
   or inactive codes 404.
2. Middleware writes the `pd_ref` cookie from the path segment.
3. Lists projects the agency may sell (ACTIVE `AgencyProjectAccess`
   in window, not archived).
4. One project → 302 to `/p/projekat/<slug>?ref=<code>`.
5. Several projects → a public catalog; each card goes to the
   microsite with `?ref=<code>`.

A project that is **not** `publicMicrositeEnabled` still opens for a
visitor who carries this code (cookie or `?ref=`), as long as the
agency has access. Guessing the slug without a valid code still 404s.

These URLs also honour `?ref=<code>` (cookie + form):

- `/p/[token]` — unit share links.
- `/p/projekat/[slug]` — public microsite (see
  [`docs/microsite.md`](./microsite.md)).

App hosts: `demo.propertydesk.app`, `staging.propertydesk.app`,
`my.propertydesk.app`. See [`environments.md`](./environments.md).

## Cookie

On `?ref=<code>` **or** `/p/r/<code>`, middleware
(`src/middleware.ts`, helpers in `src/lib/referral.ts`) sets:

- name: `pd_ref` (not `PD_REFERRAL`)
- `Path=/`, `SameSite=Lax`, `Max-Age=2592000` (30 days)
- not HttpOnly — the reservation form reads `document.cookie`
- `Secure` on HTTPS
- last-touch: a new code overwrites the previous one

The public reservation form sends the code from `?ref=` or `pd_ref`
to `POST /public/share/:token/reserve`.

## Attribution

When that POST receives a referral code (query, cookie, or body):

1. Looks up an `AgencyConnection` with the same code and matching
   `investorOrganizationId = share.link.organizationId`. This second
   condition prevents cross-investor code stuffing.
2. If found → stores the code on the `ReservationRequest` row and
   attributes the request to the agency.
3. If not found → still stores the raw code; the DTO may flag
   `referralOrphan` (not a DB column).

`confirmReservationRequest` copies `referralCode` onto the
`Reservation`. `/izvestaji/agencije` aggregates via that join.

## UI

Agency — **Ponuda** (`/ponuda`), one card per investor connection:

- Code + QR + copy. The copied URL is `/p/r/<code>`, not the login
  page.
- **Generiši novi kod** invalidates the old URL immediately.
- Body copy: the buyer opens a public catalog, without signing in.

Investor — `/izvestaji/agencije`:

- Column **Preko referral-a** — reservation requests + confirmed
  reservations attributed via `referralCode`.
- Revenue by code where the underlying reservation carries it.

## API

- `POST /api/v1/agency/referral/rotate`

  ```json
  { "connectionId": "clr…" }
  ```

  Requires `agency.read` on the caller's own connection.

## Security / abuse

- Rate limit: 6 rotates / hour / agency-connection. Excess returns
  `429 RATE_LIMITED`.
- Codes are unique globally; lookup also matches
  `investorOrganizationId`.
- Cookies are `SameSite=Lax`.

## Testing

- `src/lib/referral.test.ts` — sanitize, `?ref=` vs `/p/r/<code>`.
- `src/server/services/agencies/referral-catalog.service.test.ts` —
  catalog + microsite unlock.
