# Import / Export Formats

## Where

- Import UI: `/projekti/[projectId]/uvoz`.
- Export UI: `/projekti/[projectId]` → **Izvoz** dropdown.
- Export API: `GET /api/v1/projects/:id/export?format=csv|xlsx`.

## Supported formats

- CSV (UTF-8, comma-separated, `"` quoting). BOM optional.
- XLSX (single sheet named `Jedinice`).

## Column mapping

The downloadable CSV/XLSX template uses **localized headers** that
follow the UI language (`sr` or `en`). The map step still binds those
headers to the same canonical fields below. Switching the app language
and re-downloading the template is enough — you do not need English
column names in the file.

The import wizard has a **map** step where headers can be linked to
fields. The canonical field names are:

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `code` | string | yes | Unique per project. |
| `type` | enum | yes | `APARTMENT`, `OFFICE`, `PARKING`, `STORAGE`, `HOUSE`, `OTHER`. |
| `status` | enum | no | Defaults to `AVAILABLE`. |
| `buildingCode` | string | no | Must match an existing building. |
| `entranceCode` | string | no | Must match an existing entrance in that building. |
| `floorLabel` | string | no | Free-form label (`Prizemlje`, `1`, `PR`, …). |
| `floorNumber` | integer | no | Signed integer; `-1` = suteren, `0` = prizemlje. |
| `totalArea` | decimal(10,2) | yes | Square meters. |
| `usableArea` | decimal(10,2) | no | Square meters. |
| `terraceArea` | decimal(10,2) | no | Square meters. |
| `rooms` | integer | no | Room count. |
| `bathrooms` | integer | no | Bathroom count. |
| `orientation` | string | no | `S`, `SE`, `SW`, … |
| `listPrice` | decimal(14,2) | yes | In `currency` below. |
| `currency` | ISO-4217 | no | Defaults to `EUR`. |
| `publicDescription` | string | no | Public-facing description (visible to agencies). |
| `internalNotes` | string | no | Investor-only notes (never leaked to agencies). |

## Validation pipeline

1. **Parse** — headers detected. Non-UTF-8 files rejected with a Serbian
   error.
2. **Map** — user drags headers onto canonical fields. Duplicates flagged.
3. **Validate** — every row runs through the Zod schema; row-level
   errors are surfaced in a table with row numbers and field paths.
4. **Preview** — the confirmed subset is shown before commit.
5. **Confirm** — the service inserts rows inside a single transaction.
   Auditing records batch id + row count. On any conflict (unique
   `(projectId, code)`) the whole batch rolls back.

## Export

Export streams a CSV or XLSX with the same column names as above plus
computed columns (`buildingName`, `entranceName`, `floorNumber`) so a
round-trip works without reformatting. Money is exported as raw decimal
strings — no currency symbol.
