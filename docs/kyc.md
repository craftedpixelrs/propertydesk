# Buyer KYC (Faza 8.2 B1)

Simple, operator-driven Know-Your-Customer checklist per Buyer.
Designed to reflect Serbian small-investor practice — the operator
sees whether the buyer has handed in each document and toggles a
flag. No third-party integration, no automated verification: the
audit trail is the checklist itself.

## Data model

- `Buyer.entityType` — `NATURAL` (default) or `LEGAL`.
- `Buyer.jmbg`, `Buyer.identityNumber` — natural-person fields.
- `Buyer.taxId` (PIB), `Buyer.legalName` — legal-entity fields.
- `Buyer.addressLine1`, `Buyer.city`, `Buyer.postalCode`,
  `Buyer.country` — feed contract placeholders.
- `BuyerKycChecklist` (one row per Buyer):
  - `idFrontOk`, `idBackOk` — natural-person ID.
  - `addressProofOk` — utility bill or bank statement.
  - `taxCertOk` — poreska potvrda (mandatory for legal entities).
  - `reviewedByUserId`, `reviewedAt`, `notes`.

A checklist is **complete** when:

- `entityType = NATURAL`: `idFrontOk && idBackOk && addressProofOk`.
- `entityType = LEGAL`: `taxCertOk && addressProofOk`.

The `isKycComplete()` helper in
`src/server/services/buyers/kyc.service.ts` is the single source of
truth. Never inline the boolean expression in feature code.

## UI

`/kupci/[id]` → **KYC** tab. Layout:

- Entity-type toggle (Natural / Legal) — switching hides irrelevant
  inputs.
- ID / PIB inputs with format validation (JMBG = 13 digits, PIB = 9
  digits).
- Address inputs (feed A1 contract placeholders).
- Four-checkbox checklist with a notes textarea.
- Uploader for KYC documents (creates `Document` rows with
  `category = KYC`, `visibility = INTERNAL`).
- Read-only stamps: last reviewer + timestamp.

## API

- `GET /api/v1/buyers/:id/kyc` → returns checklist + entity fields.
  Requires `lead.read`.
- `PATCH /api/v1/buyers/:id/kyc` → upserts the checklist. Body:

  ```json
  {
    "idFrontOk": true,
    "idBackOk": true,
    "addressProofOk": true,
    "taxCertOk": false,
    "notes": "Ima staru LK, čekamo novu"
  }
  ```

  Requires `lead.manage`. The endpoint also accepts entity-field
  patches (`entityType`, `jmbg`, `taxId`, …) so the tab can save
  everything in one request.

Every PATCH writes to `AuditLog` with `action = BUYER_KYC_UPDATED`,
`resourceType = Buyer`, and `metadata` containing the diff of flags
+ entity fields.

## Contract generation gating

`POST /api/v1/sales/:id/contract/generate` with `kind = CONTRACT`
short-circuits with `409 CONFLICT { code: 'KYC_INCOMPLETE' }` when
the buyer's checklist is incomplete. The UI translates the code to
a Serbian error toast and links to the buyer's KYC tab.

`kind = PRE_CONTRACT` intentionally bypasses this guard — the
pre-contract is often the trigger for the buyer to bring the
missing documents.

## Documents

KYC uploads use `DocumentCategory.KYC` and are:

- Always `visibility = INTERNAL` (never surfaced to agencies).
- Excluded from the agency-safe DTOs by category filter — no risk of
  leaking a buyer's ID scan to the wrong tenant.
- MIME allowlist unchanged (PDF, JPEG, PNG). Files > 10 MB are
  rejected in the multipart handler.

## Retention

Per the platform's data-retention policy KYC documents that remain in
the app are kept for **5 years** after the last sale involving the
buyer. Automated age-based KYC purging is not yet implemented — track
the follow-up ticket in `docs/product/roadmap.md`.

If an operator **deletes** a KYC file in the app, it follows the same
storage rule as every other document: the row is soft-deleted
immediately and the object is removed from S3/local 45 days later by
`purge-deleted-documents`.

## Testing

`src/server/services/buyers/kyc.service.test.ts` covers:

- `isKycComplete` matrix (natural vs legal, missing flags).
- `updateKycChecklist` writes audit log and returns the fresh row.
- `getKycChecklist` seeds an empty row on first read (idempotent).
