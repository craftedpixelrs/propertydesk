# Exchange rates (EUR / RSD) and dinarska invoices

SaaS plans in PropertyDesk are priced in EUR. Domestic (Serbian) clients
often need to receive the same invoice in **dinarska protivvrednost** —
in RSD, converted at the National Bank of Serbia middle rate valid on
the day the invoice is issued.

This module lets a SUPER_ADMIN maintain a small exchange-rate list and
opt individual organizations into dinar invoicing. Conversion happens
exactly once, at issuance time, and both the pre-conversion EUR figures
and the applied rate are snapshotted on the invoice.

## Data model

Two tables + a handful of new columns on `Invoice`.

- `ExchangeRate` — the rate list. A row means "on and after
  `effectiveDate`, 1 `baseCurrency` = `rate` `quoteCurrency`". Rates are
  `Decimal(18,6)` — invoice totals are multiplied by the rate, so the
  extra precision matters.
- `Invoice.baseCurrency`, `baseSubtotal`, `baseTaxAmount`,
  `baseTotalAmount`, `fxRate`, `fxRateDate` — populated only when a
  conversion happened. `null` on a native-currency invoice.
- `GlobalBillingSettings.defaultInvoiceInRsd` — platform-wide default.
- `OrganizationBillingSettings.invoiceInRsd` — nullable per-org
  override (only honored when `mode = CUSTOM_SETTINGS`).

There is no separate `Currency` model, no per-invoice user-selectable
currency, and no automatic FX for the property-sales domain. This layer
is scoped to the SaaS billing side.

## Lookup rule

Given an issue date `D`, `getRateForDate` picks the newest
`ExchangeRate` row whose `effectiveDate <= D`. It does not interpolate
between rows. This matches the Serbian tax-law convention of "srednji
kurs na dan izdavanja fakture" and keeps the math trivially
reproducible from the audit log.

When no row is available for `D`, `issueInvoice` fails with a Serbian
error message asking the operator to add a rate. The draft stays
`DRAFT` so nothing is left in an inconsistent state.

## Conversion, step by step

The single decision point is `issueInvoice` in
[`src/server/services/billing/invoices/service.ts`](../../src/server/services/billing/invoices/service.ts).

1. Load the invoice draft and the resolved billing settings for the
   organization.
2. If `settings.invoiceInRsd` is `true` **and** the draft currency is
   not already RSD, look up the rate for `issueDate` (or
   `options.fxRateDate` if the caller supplied one).
3. Multiply `subtotal`, `taxAmount`, `totalAmount`, `amountDue`, plus
   every `InvoiceItem.unitPrice` and `amount`, by the rate. Round to
   two decimals (invoice column precision).
4. Set `currency = "RSD"`, populate the `base*` snapshot columns, and
   store `fxRate` and `fxRateDate`.
5. Repoint the invoice at the default RSD `BillingBankAccount` and
   refresh the bank-account snapshot — otherwise IPS QR generation
   would fail because it insists on RSD.
6. Allocate the sequential invoice number and flip the status to
   `ISSUED` in the same transaction.
7. Record an audit event with both the old (EUR) totals and the new
   (RSD) totals plus the rate that was applied.

If `amountPaid > 0` on the draft (an unusual but possible state when a
payment was pre-recorded), conversion refuses with `INVALID_STATE`
rather than silently changing the currency of the already-recorded
payment.

## PDF

When the FX fields are populated, the PDF template
[`src/server/pdf/documents/invoice.tsx`](../../src/server/pdf/documents/invoice.tsx)
adds a two-line note under the totals block:

```
Obračunato po srednjem kursu na dan DD.MM.YYYY: 1 EUR = X.XXXXXX RSD.
Osnovica u EUR: <subtotal> · PDV: <tax> · Ukupno: <total>.
```

That is enough for the recipient (and, later, an auditor) to reconstruct
the calculation without opening the database.

## Managing rates

- **Route:** `/administracija/naplata/kursna-lista`
  ([`src/app/(dashboard)/administracija/naplata/kursna-lista/page.tsx`](../../src/app/(dashboard)/administracija/naplata/kursna-lista/page.tsx))
- **Permission:** SUPER_ADMIN (route guarded via
  `requireSuperAdmin`; API guarded the same way).
- **API:**
  - `GET  /api/v1/billing/exchange-rates` — list (optionally
    `?base=EUR&quote=RSD&limit=N`).
  - `POST /api/v1/billing/exchange-rates` — create one row. Body:
    `{ effectiveDate, rate, note?, baseCurrency?, quoteCurrency?, source? }`.
  - `DELETE /api/v1/billing/exchange-rates/{id}` — remove one row.
    History remains in the audit log.

## Enabling dinar invoicing for an organization

- **Global default:** toggle "Fakturiši u dinarskoj protivvrednosti
  (podrazumevano)" in
  [`/administracija/naplata/podesavanja`](../../src/app/(dashboard)/administracija/naplata/podesavanja/page.tsx).
- **Per organization:** on the org's naplata tab
  ([`/administracija/organizacije/{id}/naplata`](../../src/app/(dashboard)/administracija/organizacije/[id]/naplata/page.tsx)),
  the "Valuta fakture" card offers three buttons:
  - **Fakturiši u RSD** — force this org to always convert to RSD.
  - **Fakturiši u EUR** — force this org to stay in EUR even if the
    global default is RSD.
  - **Nasledi iz globalnog** — clear the override, follow the global
    default.

Per-org overrides are stored as `boolean | null` (nullable = inherit).
The card also shows the currently effective value so the operator
never has to guess which layer won.

## NBS automation — not implemented yet

`ExchangeRateSource.NBS` is a placeholder value that the schema and API
already accept, and `fetchNbsMiddleRate` is a stub in the service. When
implemented, it should:

1. Call the NBS middle-rate feed for the target date.
2. Upsert a row with `source = NBS`.
3. Never overwrite an existing `MANUAL` row for the same date — manual
   entries always win.

Until that lands, all rows are manually entered by a SUPER_ADMIN.

## What is _not_ affected

- Property sales, reservations, and buyer-facing payments in the
  property-sales domain stay in their native currency. This module
  only touches SaaS invoices (`Invoice`, `InvoiceItem`, and the
  billing bank accounts they point to).
- FIFO payment allocation still matches on currency. An RSD invoice
  requires an RSD payment; a payment recorded in a different currency
  is skipped by the allocator. This is intentional — mixing currencies
  in a single allocation without a documented rate is a footgun and
  a common source of accounting errors.
