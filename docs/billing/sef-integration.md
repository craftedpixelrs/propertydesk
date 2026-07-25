# Serbian electronic invoicing (SEF)

Serbia's national e-invoicing platform is called SEF (_Sistem Elektronskih
Faktura_). PropertyDesk models this through a provider abstraction, so a
tenant can either submit invoices manually or route them via SEF.

## Provider abstraction

Interface: `ElectronicInvoiceProvider` in
[`providers.ts`](../../src/server/services/billing/electronic-invoice/providers.ts).

```ts
interface ElectronicInvoiceProvider {
  readonly type: 'MANUAL' | 'SERBIAN_SEF';
  submit(context): Promise<{ status, providerReference, responsePayload, errorMessage }>;
  cancel?(context, reason): Promise<...>;
}
```

Two implementations ship today:

- **MANUAL** — a passthrough. Marks the record as `SENT` immediately.
  Used when the operator submits invoices via the SEF web portal
  themselves; we still track the record so the UI can show status.
- **SERBIAN_SEF** — a stub that simulates `ACKNOWLEDGED`. The real HTTP
  transport is scaffolded but currently disabled; wiring it up requires
  the SEF API key + endpoint per environment (staging / production) and a
  UBL 2.1 XML serializer for `Invoice`.

## Turning it on

1. Fill in the company billing profile at
   `/administracija/naplata/profil-firme` — including the SEF API key.
   The key is AES-256-GCM encrypted with `BILLING_SECRET_KEY` and stored
   as `sefApiKeyEncrypted`.
2. Toggle "Elektronski računi" in `/administracija/naplata/podesavanja`.
3. Choose the provider (`MANUAL` for now, `SERBIAN_SEF` once transport
   is wired).
4. On the next invoice issuance, an `ElectronicInvoiceRecord` is created
   in `PENDING`.

## Retry loop

The `billing.sync-sef` job iterates every `ElectronicInvoiceRecord` in
`PENDING` or `FAILED` and calls `provider.submit`. Failures increment
`attempts` and set `nextRetryAt = now + exponentialBackoff(attempts)`.
After the configured cap the record stays `FAILED` and a super-admin can
intervene from `/administracija/naplata/sef`.

## Cancellation

For invoices previously accepted by SEF, cancellation must be done via
the provider. `SerbianSefProvider.cancel(context, reason)` writes a
`REJECTED` record with the reason preserved in `responsePayload`. This is
distinct from voiding the local `Invoice` — both actions typically run
together.

## Security notes

- The API key is never logged (`secrets.ts` refuses to echo decrypted
  material).
- Only super-admin can read the masked key from the UI.
- The key is scoped to the operator, not per tenant — SEF requires one
  key per issuer legal entity.
