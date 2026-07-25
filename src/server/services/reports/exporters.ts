import "server-only";
import Papa from "papaparse";
import ExcelJS from "exceljs";

/**
 * Report exporters — thin adapters over papaparse / ExcelJS. Reports pass in
 * ordered `columns` + serialized `rows`; we produce byte payloads suitable for
 * `new NextResponse(buffer, { headers: { 'Content-Type': … } })`.
 */

export interface Column<TRow> {
  key: keyof TRow & string;
  label: string;
  /** Optional value transformer (e.g. currency formatter). */
  format?: (value: TRow[keyof TRow & string], row: TRow) => string | number;
}

export function rowsToCsv<TRow extends Record<string, unknown>>(
  columns: Column<TRow>[],
  rows: TRow[],
): string {
  const headers = columns.map((c) => c.label);
  const body = rows.map((row) =>
    columns.map((c) => {
      const raw = row[c.key];
      const value = c.format ? c.format(raw as TRow[keyof TRow & string], row) : raw;
      if (value === null || value === undefined) return "";
      return typeof value === "string" || typeof value === "number" ? value : String(value);
    }),
  );
  return Papa.unparse({ fields: headers, data: body }, { delimiter: "," });
}

export async function rowsToXlsx<TRow extends Record<string, unknown>>(
  sheetName: string,
  columns: Column<TRow>[],
  rows: TRow[],
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "PropertyDesk";
  workbook.created = new Date();
  const worksheet = workbook.addWorksheet(sheetName.slice(0, 31));

  worksheet.columns = columns.map((c) => ({
    header: c.label,
    key: c.key,
    width: Math.min(48, Math.max(12, c.label.length + 4)),
  }));

  for (const row of rows) {
    const rec: Record<string, unknown> = {};
    for (const c of columns) {
      const raw = row[c.key];
      rec[c.key] = c.format ? c.format(raw as TRow[keyof TRow & string], row) : raw;
    }
    worksheet.addRow(rec);
  }

  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).alignment = { vertical: "middle" };
  worksheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: columns.length },
  };

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

export function csvResponseHeaders(filename: string): Record<string, string> {
  return {
    "Content-Type": "text/csv; charset=utf-8",
    "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}.csv"`,
    "Cache-Control": "no-store",
  };
}

export function xlsxResponseHeaders(filename: string): Record<string, string> {
  return {
    "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}.xlsx"`,
    "Cache-Control": "no-store",
  };
}
