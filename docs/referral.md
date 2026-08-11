# Agency referral codes (Faza 8.3 C2)

Every `AgencyConnection` — the join row that links an agency
organisation to an investor organisation — can carry an 8-character
`referralCode`. The code turns any public URL into a trackable link:
who did the visitor come from, which sale should the agency get
attributed on. This is the entry-level version of a marketplace —
attribution before formal buyer registration.

## Data model

- `AgencyConnection.referralCode` — nullable, unique globally. Format
  is `[A-Z0-9]{8}` (excludes visually ambiguous chars `0`, `O`, `1`,
  `I`, `L`).
- `ReservationRequest.referralCode` — mirrored on public form submit.
- `Reservation.referralCode` — mirrored on `confirmReservationRequest`.
- Sales inherit the code from their originating reservation but
  don't store it separately (the join `sale → reservation` is enough
  for reporting).

The code is generated lazily on first "Rotate" action; there's no
default. This keeps the report attribution clean — a NULL code means
"connection has not adopted the referral flow yet", not "attribution
lost".

## URLs

The following public URLs honour a `ref` query parameter:

- `/p/[token]` — unit share links.
- `/p/projekat/[slug]` — public microsite (see
  [`docs/microsite.md`](./microsite.md)).

On any of these, `?ref=<code>`:

1. Sets a cookie `PD_REFERRAL=<code>`, `Path=/`, `SameSite=Lax`,
   `Max-Age=7776000` (90 days), no `Secure` flag in dev.
2. Is passed through to the reservation form as a hidden input.
3. Overwrites any previously stored referral (last-touch attribution).

## Attribution

When `POST /public/share/:token/reserve` receives a referral code
(query, cookie, or form field), the service:

1. Looks up an `AgencyConnection` with the same code and matching
   `investorOrganizationId = share.link.organizationId`. This second
   condition prevents cross-investor code stuffing.
2. If found → stores the code on the `ReservationRequest` row and
   attributes the request to the agency in the investor UI ("Zahtev
   preko referral-a — Agencija X").
3. If not found → still stores the raw code but flags the row as
   `referralOrphan = true` in the DTO (not stored on the row) so the
   UI can show "nepoznat referral kod".

Any resulting `Reservation` (from `confirmReservationRequest`)
inherits `referralCode`. Sales inherit it via the reservation FK,
which is what the `/izvestaji/agencije` report uses.

## UI

Agency side — `/agencija/profil` and each connection row on
`/agencija/investitori`:

- "Vaš referral kod" — displayed as a chip with copy-to-clipboard.
- "Rotiraj" — generates a fresh code (invalidates the old one). The
  UI warns that any previously shared link will stop attributing.
- QR PNG — right-side helper that renders a 200×200 QR encoding the
  referral URL for the currently selected investor + project (or the
  investor's microsite when no project is selected).

Investor side — `/izvestaji/agencije`:

- New column: **Preko referral-a** — count of reservation requests +
  count of confirmed reservations attributed via `referralCode`.
- Detail drawer: revenue by referral code — sums `Sale.finalPrice`
  where the underlying reservation carries the code.

## API

- `POST /api/v1/agency/referral/rotate` — generates a new code on
  the caller's connection to a specified investor.

  ```json
  {
    "investorOrganizationId": "clr…"
  }
  ```

  Requires `agency.read` (any agency member with connection access
  can rotate their own code — it's the connection's, not the agent's).

## Security / abuse

- Rate limit: 6 rotates / hour / agency-connection. Excess returns
  `429 RATE_LIMITED`.
- Codes are unique globally, but the connection lookup also matches
  on `investorOrganizationId` — a leaked code that "somebody else"
  posts to a share link they got hold of can't cause cross-tenant
  attribution.
- Cookies are `SameSite=Lax` so a CSRF POST from another site can't
  set the attribution on behalf of the visitor.

## Testing

`src/server/services/agencies/referral.service.test.ts` covers:

- Rotate: generates unique code, invalidates the old one, rate
  limit.
- Attribution: code from query, cookie, form body — precedence.
- Orphan code: recorded on the row, not attributed to any agency.
- Cross-investor mismatch: same code, wrong investor → not
  attributed.
