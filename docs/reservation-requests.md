# Online reservation requests (Faza 8.1 A2)

Public-facing "reserve this unit online, pay the deposit by scanning
IPS QR" flow. Sits on top of the existing `ShareLink` infrastructure
and materialises regular `Reservation` rows on confirmation, so
everything downstream (payment plan, contract generation, commission
resolution) works unchanged.

## Actors and surfaces

| Actor | Surface | Notes |
|-------|---------|-------|
| Public visitor (no login) | `/p/[token]` unit offer page | Form is only shown when the share link is active + the unit is `AVAILABLE`. |
| Investor operator | `/rezervacije/zahtevi` | Lists all `PENDING`, `CONFIRMED`, `DECLINED`, `EXPIRED` requests for their organisation. Detail drawer shows the IPS QR PNG + reference. |
| Cron | `POST /api/v1/jobs/expire-reservation-requests` | Every 15 minutes, marks past `expiresAt` rows as `EXPIRED` and releases the unit. |

## Data model

Table: [`ReservationRequest`](../prisma/schema.prisma) (see
[`docs/database.md`](./database.md#phase-81-migrations-sales-cycle-closure)).
Key columns:

- `status` — `PENDING` / `CONFIRMED` / `DECLINED` / `EXPIRED`.
- `depositAmount` + `currency` — `EUR` allowed (see IPS QR notes).
- `ipsReference` — 12-digit numeric *poziv na broj* with Mod-97
  check digit.
- `ipsQrPngPath` — storage key of the pre-generated deposit QR PNG.
- `referralCode` — from `?ref=<code>`, `/p/r/<code>`, or the
  `pd_ref` cookie (see [`docs/referral.md`](./referral.md)).
- `expiresAt` — request TTL (default 48h).

Concurrency guards:

- Service-layer check: at most **one PENDING** request per unit at a
  time. Concurrent submissions surface as `409 CONFLICT` with a
  Serbian message.
- Unit must be `AVAILABLE` or already `ON_HOLD` from the same
  request — the service transitions it to `ON_HOLD` on create and
  back to `AVAILABLE` on decline / expire.

## Public API

```
POST /api/v1/public/share/:token/reserve
Content-Type: application/json

{
  "firstName": "Petar",
  "lastName": "Petrović",
  "email": "petar@example.com",
  "phone": "+381 60 111 22 33",
  "depositAmount": 500,
  "notes": "Interesuje me terasa",
  "referralCode": "A1B2C3D4"          // optional, from cookie or ?ref
}
```

Response:

```json
{
  "data": {
    "id": "clr…",
    "ipsReference": "97 42-123456789012",
    "ipsQrAvailable": true,
    "expiresAt": "2026-09-01T12:00:00.000Z"
  }
}
```

Follow-up:

- `GET /api/v1/public/reservation-requests/:id/qr` → signed PNG URL
  (5-minute lifetime) so the buyer can open the QR in the
  confirmation email on any device without exposing a permanent
  bucket URL.

Investor-side:

- `GET /api/v1/reservation-requests` — list + filters
  (`status`, `unitId`, `q`).
- `POST /api/v1/reservation-requests/:id/confirm` — verify the
  deposit has been received. Creates a `Reservation` for the same
  unit + upserted `Buyer`. Unit `ON_HOLD → RESERVED`.
- `POST /api/v1/reservation-requests/:id/decline` — with mandatory
  reason. Unit `ON_HOLD → AVAILABLE`.

## Rate limiting

The public endpoint is rate-limited to **10 requests / hour / IP**
via the shared `sensitiveActionLimiter`. Because the visitor is not
authenticated, this is the only defence against bulk submissions —
please leave it in place.

## Who receives the deposit

`OrganizationProfile.paymentAccountNumber` (and optional
`paymentBankName`) is the current account for kapara / avans.

- Direct investor share link → investor account.
- Agency referral (`?ref=`, `/p/r/<code>`, `pd_ref`) → agency account
  when the agency has filled theirs; otherwise the investor account.

Both investor and agency edit the account on **Podešavanja → Profil
organizacije**.

## Emails

Buyer mail goes through `sendEmail` (see [`docs/email.md`](./email.md)):

1. **Zahtev poslat** — after `POST /public/share/:token/reserve`.
   Includes hold expiry, payee, current account, amount, and
   *poziv na broj*.
2. **Rezervacija potvrđena** — after the investor confirms the
   request. Includes reservation validity and the same payment
   instructions.

## IPS QR generation

Handled by
[`SerbianIpsQrProvider`](../src/server/services/billing/ips-qr/serbian-provider.ts).
The reservation-request payload differs from a SaaS-invoice QR — see
[`docs/billing/ips-qr.md#reservation-deposits`](./billing/ips-qr.md#reservation-deposits).

Key implementation detail: the `poziv na broj` check digit uses
`BigInt`. If you change `generateIpsReference` and mix `Number` and
`BigInt` you'll trip
`TypeError: Cannot mix BigInt and other types, use explicit conversions`
at runtime. The current safe shape:

```ts
const remainder = BigInt(twelve) % 97n;
const check = Number(98n - remainder);
```

## Auditing

Every state transition (`create`, `confirm`, `decline`, `expire`)
writes to `AuditLog` with:

- `action` — `RESERVATION_REQUEST_CREATED` / `_CONFIRMED` /
  `_DECLINED` / `_EXPIRED`.
- `resourceType` = `ReservationRequest`, `resourceId` = row id.
- `metadata` — buyer name, unit id, amount, reason (when declining).

Public submissions record `actorUserId = null` and rely on the
request's own row for context. Do not extend the audit log with the
IP address — GDPR/ZZLP wants that kept out of long-lived storage.

## Testing

Unit tests live in
[`src/server/services/reservations/reservation-requests.service.test.ts`](../src/server/services/reservations/reservation-requests.service.test.ts).
Cover:

- `createReservationRequest` — happy path + unit already held + rate
  limit + invalid token.
- `generateIpsReference` — Mod-97 check digit (regression for the
  `TypeError` bug).
- `confirmReservationRequest` — transitions unit, creates buyer +
  reservation, propagates referral code.
- Expiry job — marks rows past `expiresAt`, releases the unit.
