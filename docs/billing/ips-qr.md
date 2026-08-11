# IPS QR (National Bank of Serbia payment QR)

`IPS` is the NBS's instant-payment scheme. Every RSD invoice PDF carries
an IPS-compatible QR code that Serbian banking apps parse to prefill the
transfer form. Payer scans, confirms, done.

## Payload format

Serialized by [`SerbianIpsQrProvider.buildPayload`](../../src/server/services/billing/ips-qr/serbian-provider.ts):

```
K:PR|V:01|C:1|R:<account>|N:<receiver>|I:RSD<amount>|P:<payer>|SF:<purpose>|S:<description>|RO:<reference>
```

| Segment | Meaning | Max width | Notes |
| --- | --- | --- | --- |
| `K:PR` | Kind = Payment | fixed | |
| `V:01` | Spec version | fixed | |
| `C:1` | Character set = Latin | fixed | |
| `R:` | Receiver account | 18 digits | dashes / spaces stripped |
| `N:` | Receiver name | 70 chars | trimmed to ASCII-safe |
| `I:` | Amount | `RSD1234,50` | Serbian comma decimal |
| `P:` | Payer name | 70 chars | optional |
| `SF:` | Purpose code | 3 digits | default `289` |
| `S:` | Description | 35 chars | optional |
| `RO:` | Reference | 35 chars | e.g. `97 1234567890` |

## Validation

- Amount must be positive.
- Account must be exactly 18 digits after stripping separators.
- Currency must be `RSD` — the provider refuses anything else.
- Over-long fields are truncated silently (per NBS spec: "shall not
  exceed"), never rejected.

## PNG rendering

`generate(request)` returns:

```ts
{
  payload: string,           // for debugging / audit
  pngBuffer: Buffer,         // 320x320 PNG, error correction M
  contentType: 'image/png',
}
```

The buffer is inlined into the invoice PDF and served from
`/api/v1/billing/invoices/{id}/ips-qr` when needed independently.

## Disabling per-tenant

Set `OrganizationBillingSettings.ipsQrEnabled = false`. The PDF renderer
will skip the QR block and print a "IPS QR nije aktiviran" placeholder
instead. Useful for tenants whose bank account is outside Serbia.

## Reservation deposits (Faza 8.1 A2)

The same provider powers the deposit IPS QR for public online
reservations. When a visitor submits the form at `/p/[token]` the
service creates a `ReservationRequest` row and calls
`SerbianIpsQrProvider.generate(...)` with:

| Segment | Reservation deposit | SaaS invoice |
| --- | --- | --- |
| `R:` | Investor's default bank account (from `OrganizationBillingSettings`) | PropertyDesk platform account |
| `N:` | Investor legal name (from `OrganizationProfile.legalName`) | `PropertyDesk d.o.o.` |
| `P:` | Buyer full name — first + last from the reservation form | Tenant legal name |
| `I:` | `Currency + Amount` — `RSD` or `EUR` allowed (see below) | `RSD` only |
| `SF:` | `289` — `Kapara` | Purpose code from invoice |
| `S:` | `Kapara za jedinicu <code> · <projectName>` | Invoice number |
| `RO:` | Generated 12-digit *poziv na broj* — see below | Invoice IPS reference |

The generated PNG is uploaded to `StorageProvider` under
`reservation-request/{id}/deposit-qr.png` and its storage key is
saved as `reservation_request.ipsQrPngPath`. The `/rezervacije/zahtevi`
detail page + the buyer's confirmation email both link to
`GET /api/v1/public/reservation-requests/:id/qr`, which returns a
signed URL to that PNG (5-minute lifetime, no authentication so the
buyer can open it from the email on any device).

### EUR handling

The core provider validates `Currency === 'RSD'` for SaaS invoices —
that constraint is unchanged. Reservation deposits, however, are
frequently priced in EUR by investors. When `depositAmount.currency
=== 'EUR'` the provider takes a **bypass path**: it still generates a
QR (payload uses `I:EUR<amount>`), but marks the row with a warning
so `/rezervacije/zahtevi` shows a "banka klijenta mora podržati
prekogranično plaćanje" hint. Banks that follow the strict NBS
profile will reject the QR, so investors who need guaranteed
scanning should keep the deposit in RSD.

### `poziv na broj` (structured reference)

Reservation IPS references use the `97` (Mod-97) model:

```
97 <10-digit-numeric-payload>
```

Where the 10-digit payload encodes the reservation-request row's
short id plus a two-digit check digit. The check digit is calculated
in `generateIpsReference` and **must** be computed with `BigInt`
arithmetic — mixing `Number` and `BigInt` throws
`TypeError: Cannot mix BigInt and other types, use explicit conversions`.
The current implementation:

```ts
const remainder = BigInt(twelve) % 97n;
const check = Number(98n - remainder);
```

If you touch this function, keep the same shape or add an explicit
regression test in
[`src/server/services/reservations/reservation-requests.service.test.ts`](../../src/server/services/reservations/reservation-requests.service.test.ts).
