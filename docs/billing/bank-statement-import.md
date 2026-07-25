# Bank statement import

Operators upload CSV or XLSX bank statements at
`/administracija/naplata/izvodi`. The system parses each statement,
attempts to auto-match every transaction to an open invoice, and puts
anything ambiguous into a review queue.

## Supported formats

| Format | Status | Notes |
| --- | --- | --- |
| CSV (comma / semicolon / tab) | Fully supported | Column aliases handle Serbian, Latin, and English headers (`datum`, `iznos`, `poziv na broj`, `opis`, …). |
| XLSX | Fully supported | Uses `exceljs`. First sheet, first row = header row. |
| MT940 | Stubbed | Parser exists but currently rejects with a helpful error. |
| CAMT.053 | Stubbed | Same as MT940. |

## Column aliasing

The parser normalizes header names to canonical fields:

- `date` — booking or value date.
- `amount` — signed dinar amount (parser handles both `-1.000,50` and `-1000.50`).
- `currency` — defaults to `RSD` if missing.
- `reference` — model + reference number (e.g. `97 1234567890`).
- `counterparty` — payer name.
- `description` — free-text note.
- `counterpartyAccount` — payer account number (optional).

Unknown columns are preserved as `metadata` JSON on the parsed row.

## 5-signal matcher

For every parsed transaction, the matcher computes a confidence score
using five signals:

1. **Reference model + number** — exact match against
   `Invoice.paymentReference`. Highest weight.
2. **Amount + currency** — exact match against `Invoice.amountDue`
   (partial or full).
3. **Counterparty account** — matches the tenant's registered bank
   account.
4. **Counterparty name** — Levenshtein/normalized comparison against
   `Organization.name` / `CompanyBillingProfile.legalName`.
5. **Booking date proximity** — soft signal favouring recent invoices.

Outcomes:

| Confidence | Match state | Automatic action |
| --- | --- | --- |
| `>= 0.9` and single-candidate | `AUTO_MATCHED` | Record a `SubscriptionPayment` immediately, allocate, extend subscription. |
| `0.5` – `0.9` | `REVIEW_REQUIRED` | Sent to the review queue with the top candidate suggestion. |
| `< 0.5` or ambiguous | `UNMATCHED` | Sent to the review queue with no suggestion. |

## Manual review

`/administracija/naplata/izvodi` shows unresolved rows. For each row an
operator can:

- **Match to invoice** — supply an invoice ID or invoice number.
- **Ignore** — supply a reason. Row is moved to `IGNORED` and never
  reappears (but is preserved for audit).

Both actions are audited (`billing.bank_statement_transaction_matched`
and `.ignored`).

## Idempotency

Every parsed transaction has a deterministic hash based on
`(bankStatementImportId, bookingDate, amount, reference)`. Re-importing
the same statement is a no-op: rows whose hash already exists are
skipped, with a summary line showing how many duplicates were seen.
