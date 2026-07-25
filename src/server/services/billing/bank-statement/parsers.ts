import "server-only";
import Papa from "papaparse";
import ExcelJS from "exceljs";
import { toDecimal } from "@/lib/formatters/money";
import { DomainErrors } from "@/lib/errors";
import type { BankStatementRow } from "./service";

/**
 * Format parsers for bank-statement imports.
 *
 *   - CSV: uses Papa Parse with header row. Supports both semicolon (Serbian
 *          default) and comma delimiters. Column names are matched
 *          case-insensitively against a small alias table so exports from
 *          NLB, Raiffeisen, UniCredit and OTP land in the same shape.
 *   - XLSX: uses ExcelJS. First worksheet, header row detected as the first
 *           row whose first cell is `Datum` or `Date`.
 *   - MT940 / CAMT053: stubbed — the file is stored, but parsing is deferred
 *           to a follow-up PR (see docs/bank-statement-import.md).
 */

// Column aliases (Serbian + Latin) → canonical field name.
const ALIASES: Record<string, keyof BankStatementRow> = {
  datum: "transactionDate",
  "datum transakcije": "transactionDate",
  date: "transactionDate",
  "trans date": "transactionDate",
  "value date": "valueDate",
  "datum valute": "valueDate",
  iznos: "amount",
  amount: "amount",
  suma: "amount",
  valuta: "currency",
  currency: "currency",
  "naziv naloga": "counterpartyName",
  "counterparty name": "counterpartyName",
  primalac: "counterpartyName",
  nalogodavac: "counterpartyName",
  iban: "counterpartyIban",
  "counterparty iban": "counterpartyIban",
  "poziv na broj": "counterpartyRef",
  reference: "reference",
  "svrha uplate": "narrative",
  narrative: "narrative",
  opis: "narrative",
  "external id": "externalId",
  "id transakcije": "externalId",
};

function parseDate(raw: unknown): Date {
  if (raw instanceof Date) return raw;
  const s = String(raw ?? "").trim();
  if (!s) throw DomainErrors.badRequest("Datum transakcije je obavezan.");
  // Try ISO first, then dd.mm.yyyy Serbian format.
  const iso = Date.parse(s);
  if (!Number.isNaN(iso)) return new Date(iso);
  const m = /^(\d{1,2})[.\/\-](\d{1,2})[.\/\-](\d{2,4})$/.exec(s);
  if (m) {
    const [, d, mm, y] = m;
    const year = Number(y!.length === 2 ? `20${y}` : y);
    return new Date(year, Number(mm) - 1, Number(d));
  }
  throw DomainErrors.badRequest(`Neispravan format datuma: ${s}`);
}

function parseAmount(raw: unknown): string {
  const s = String(raw ?? "").replace(/\./g, "").replace(",", ".").trim();
  if (!s) throw DomainErrors.badRequest("Iznos je obavezan.");
  const value = toDecimal(s);
  return value.toFixed(2);
}

function mapRow(rec: Record<string, unknown>): BankStatementRow {
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(rec)) {
    const canonical = ALIASES[key.trim().toLowerCase()];
    if (canonical) out[canonical] = rec[key];
  }
  const currency = String(out.currency ?? "RSD").toUpperCase().slice(0, 3);
  return {
    transactionDate: parseDate(out.transactionDate),
    valueDate: out.valueDate ? parseDate(out.valueDate) : null,
    amount: parseAmount(out.amount),
    currency,
    counterpartyName: (out.counterpartyName as string | undefined) ?? null,
    counterpartyIban: (out.counterpartyIban as string | undefined) ?? null,
    counterpartyRef: (out.counterpartyRef as string | undefined) ?? null,
    reference: (out.reference as string | undefined) ?? null,
    narrative: (out.narrative as string | undefined) ?? null,
    externalId: (out.externalId as string | undefined) ?? null,
  };
}

export function parseCsv(text: string): BankStatementRow[] {
  const delimiter = text.split("\n")[0]?.includes(";") ? ";" : ",";
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    delimiter,
  });
  if (parsed.errors.length > 0) {
    const first = parsed.errors[0];
    throw DomainErrors.badRequest(
      `CSV parsiranje: ${first?.message ?? "nepoznata greška"} na redu ${first?.row ?? "?"}.`,
    );
  }
  return parsed.data.map(mapRow);
}

export async function parseXlsx(buffer: Buffer): Promise<BankStatementRow[]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer as unknown as ArrayBuffer);
  const ws = wb.worksheets[0];
  if (!ws) throw DomainErrors.badRequest("XLSX fajl je prazan.");
  const rows: BankStatementRow[] = [];
  let headers: string[] | null = null;
  ws.eachRow({ includeEmpty: false }, (row) => {
    const values = row.values as Array<unknown>;
    // ExcelJS uses 1-based indexing; index 0 is undefined.
    const cells = values.slice(1).map((v) => (v == null ? "" : String(v)));
    if (!headers) {
      const looksLikeHeader = cells.some((c) =>
        ["datum", "date"].includes(c.trim().toLowerCase()),
      );
      if (!looksLikeHeader) return;
      headers = cells.map((c) => c.trim());
      return;
    }
    const record: Record<string, unknown> = {};
    headers.forEach((h, i) => {
      record[h] = cells[i];
    });
    rows.push(mapRow(record));
  });
  if (rows.length === 0) {
    throw DomainErrors.badRequest("XLSX fajl ne sadrži transakcije.");
  }
  return rows;
}

/** MT940 / CAMT053 parsing is intentionally stubbed — see docs. */
export function parseSwiftLike(_content: string): BankStatementRow[] {
  throw DomainErrors.badRequest(
    "Podrška za MT940 / CAMT053 format je u pripremi. Uvezite CSV ili XLSX.",
  );
}
