# Sale contracts (Faza 8.1 A1)

Reusable HTML templates for pre-contracts (*predugovor*) and full
contracts (*ugovor o kupoprodaji*), rendered to PDF and attached to
the sale as `Document` rows. Every state transition writes to
`AuditLog` and mutates a small set of `Sale` columns so the sale
detail page can show the current contract status at a glance.

## Data model

- `SaleContractTemplate` — org-owned HTML blueprint. Columns:
  `kind` (`PRE_CONTRACT` / `CONTRACT`), `name`, `description`,
  `contentHtml`, `variables` (JSON manifest of expected placeholder
  keys), `isActive`.
- `Sale.contractStatus` — `NONE` / `GENERATED` / `SENT` / `SIGNED` /
  `CANCELED`.
- `Sale.contractSentAt`, `Sale.contractSignedAt` — timestamps for the
  transitions.
- `Sale.contractTemplateId` — soft FK. Template rows can be deleted
  without cascading to sales; deleting a template just leaves the
  reference as a dangling id (the historical PDF and audit trail
  remain intact).

Enums live in `prisma/schema.prisma`; see
[`docs/database.md`](./database.md#phase-81-migrations-sales-cycle-closure).

## Placeholder syntax

Templates use the same whitelisted `{{var}}` substitution as billing
email templates (see `safeSubstitute` in
[`src/server/services/billing/templates`](../src/server/services/billing/templates)).
Any key not on the whitelist is left as-is with a visible marker so
the operator can see what's missing before sending.

Available placeholders:

| Group | Keys | Source |
|-------|------|--------|
| Buyer | `buyer.firstName`, `buyer.lastName`, `buyer.jmbg`, `buyer.identityNumber`, `buyer.taxId`, `buyer.entityType`, `buyer.legalName`, `buyer.addressLine1`, `buyer.city`, `buyer.postalCode`, `buyer.country`, `buyer.email`, `buyer.phone` | `Buyer` row |
| Seller | `seller.name`, `seller.taxId`, `seller.address`, `seller.iban`, `seller.email` | `OrganizationProfile` |
| Unit | `unit.code`, `unit.projectName`, `unit.type`, `unit.totalArea`, `unit.internalArea`, `unit.floorLabel`, `unit.orientation` | `Unit` + `Project` + `Floor` |
| Sale | `sale.listPrice`, `sale.discountValue`, `sale.finalPrice`, `sale.currency`, `sale.depositAmount`, `sale.contractDate`, `sale.plannedHandoverDate` | `Sale` |
| Tax | `tax.mode`, `tax.amount`, `tax.payer`, `tax.rateLabel` | `Sale.vatMode` + `computeSaleTax` (see [`docs/business-rules.md`](./business-rules.md#sales)) |
| Plan | `plan.installments` (table), `plan.totalAmount`, `plan.currency` | `PaymentPlan` + `PaymentInstallment[]` |
| Meta | `today`, `contract.number`, `contract.city` | Derived |

Numeric placeholders use `formatMoney` and locale `sr-Latn` — never
raw decimals. Dates use `formatDate(..., 'sr-Latn')`.

## Template CRUD

- `GET /api/v1/sale-contract-templates?kind=PRE_CONTRACT|CONTRACT`
- `POST /api/v1/sale-contract-templates`
- `GET/PATCH/DELETE /api/v1/sale-contract-templates/:id`

All require `sale.manage`. The UI lives at
`/podesavanja/ugovori-sabloni` (org-wide) with a rich-text editor,
placeholder legend, and a live preview panel that renders against a
demo sale.

## Generation flow

`POST /api/v1/sales/:id/contract/generate`

Body:

```json
{
  "templateId": "clr…",
  "kind": "CONTRACT"
}
```

Server steps (all inside one transaction):

1. `requirePermission('sale.manage')`.
2. Guard: `sale.buyer.kycChecklist` must be complete when the
   `kind = CONTRACT` (soft block for `PRE_CONTRACT` — pre-contract is
   used *to* collect the deposit before KYC is finalised). Failure
   returns `409 CONFLICT` with code `KYC_INCOMPLETE`.
3. Resolve placeholders via `safeSubstitute` against the sale, unit,
   buyer, and org data.
4. Render the interpolated HTML → PDF via
   [`renderSaleContract`](../src/features/pdf/documents/sale-contract.tsx)
   (uses `@react-pdf/renderer`).
5. Upload the PDF as a `Document` (category `SALE`, `entityId =
   saleId`, `visibility = INTERNAL`).
6. Update the sale: `contractStatus = GENERATED`,
   `contractTemplateId = templateId`.
7. `recordAudit('CONTRACT_GENERATED', …)`.

The API response echoes the new `Document` id and download URL so
the UI can offer a "Preuzmi PDF" link.

## Follow-up transitions

- `POST /api/v1/sales/:id/contract/mark-sent` → `GENERATED → SENT`,
  stamps `contractSentAt = now()`. Audit: `CONTRACT_SENT`.
- `POST /api/v1/sales/:id/contract/mark-signed` → `SENT → SIGNED`,
  stamps `contractSignedAt = now()`. Audit: `CONTRACT_SIGNED`.
- Cancellation currently happens implicitly (regenerating a contract
  sets the previous PDF to `visibility = INTERNAL` but keeps it in
  the Document store; the `Sale.contractStatus` is reset to
  `GENERATED`). If you need an explicit "cancel" flow, add it to
  `contracts.service.ts` and update this doc.

## Templates seed

`prisma/seed.ts` inserts three defaults on a new org:

1. **Predugovor — novogradnja** (`PRE_CONTRACT`) — includes deposit +
   full price + payment plan reference. Uses `{{tax.mode}}` so
   `NEW_BUILD_10` vs `SECONDARY_MARKET_2_5` renders correctly.
2. **Ugovor o kupoprodaji — novogradnja** (`CONTRACT`) — full
   sales contract with handover clauses and dispute-resolution
   boilerplate.
3. **Ugovor o kupoprodaji — sekundarno tržište** (`CONTRACT`) —
   secondary-market variant with 2.5% PPAP language.

Investors are expected to fork these and adapt them to their
notary's exact wording. The seed acts as a starting scaffold.

## Testing

- `src/server/services/sales/contracts.service.test.ts` — placeholder
  substitution, KYC guard, PDF stream smoke, status transitions.
- `src/features/pdf/documents/sale-contract.test.tsx` — snapshot of
  the rendered PDF layout (react-pdf JSON tree).
