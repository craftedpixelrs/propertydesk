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
