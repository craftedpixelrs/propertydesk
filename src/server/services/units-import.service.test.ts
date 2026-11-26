import { describe, expect, it } from "vitest";

import ExcelJS from "exceljs";

import {
  UNIT_EXPORT_COLUMNS,
  UNIT_IMPORT_TEMPLATE_COLUMNS,
  UNIT_IMPORT_TEMPLATE_SAMPLE,
  buildImportTemplateCsv,
  parseFile,
  readExportedUnitRows,
  validateRows,
  type HeaderMap,
} from "./units-import.service";

/**
 * Focused unit tests for the CSV/XLSX validator.
 *
 * We keep these pure (no Prisma, no I/O) because commit correctness is
 * covered by the transactional service itself; here we only guard the
 * translation from a spreadsheet row into a typed row.
 */

const map: HeaderMap = {
  code: "code",
  type: "type",
  status: "status",
  totalArea: "totalArea",
  basePrice: "basePrice",
};

describe("validateRows", () => {
  it("accepts a well-formed row", () => {
    const row = validateRows(map, [
      {
        code: "A1",
        type: "APARTMENT",
        status: "AVAILABLE",
        totalArea: "56.5",
        basePrice: "125000",
      },
    ])[0]!;
    expect(row.ok).toBe(true);
    expect(row.data?.code).toBe("A1");
    expect(row.data?.type).toBe("APARTMENT");
    expect(row.data?.totalArea).toBe(56.5);
    expect(row.data?.basePrice).toBe(125000);
  });

  it("accepts a row with an empty price", () => {
    const row = validateRows(map, [
      { code: "A5", type: "APARTMENT", totalArea: "51.9", basePrice: "" },
    ])[0]!;
    expect(row.ok).toBe(true);
    expect(row.data?.basePrice).toBeNull();
  });

  it("rejects a negative price", () => {
    const row = validateRows(map, [
      { code: "A6", type: "APARTMENT", totalArea: "51.9", basePrice: "-1" },
    ])[0]!;
    expect(row.ok).toBe(false);
    expect(row.errors[0]).toMatch(/Osnovna cena/);
  });

  it("rejects missing required fields", () => {
    const row = validateRows(map, [
      { code: "", type: "APARTMENT", totalArea: "50", basePrice: "1" },
    ])[0]!;
    expect(row.ok).toBe(false);
    expect(row.errors[0]).toMatch(/Šifra/);
  });

  it("rejects invalid enum values", () => {
    const row = validateRows(map, [
      { code: "A2", type: "UNKNOWN", totalArea: "50", basePrice: "1" },
    ])[0]!;
    expect(row.ok).toBe(false);
    expect(row.errors.some((e) => /Nepoznat tip/.test(e))).toBe(true);
  });

  it("flags duplicate codes inside the same import", () => {
    const rows = validateRows(map, [
      { code: "A1", type: "APARTMENT", totalArea: "50", basePrice: "1" },
      { code: "A1", type: "APARTMENT", totalArea: "50", basePrice: "1" },
    ]);
    expect(rows[0]!.ok).toBe(true);
    expect(rows[1]!.ok).toBe(false);
    expect(rows[1]!.errors[0]).toMatch(/Duplirana šifra/);
  });

  it("accepts comma as decimal separator", () => {
    const row = validateRows(map, [
      { code: "A3", type: "APARTMENT", totalArea: "56,5", basePrice: "125000,50" },
    ])[0]!;
    expect(row.ok).toBe(true);
    expect(row.data?.totalArea).toBe(56.5);
    expect(row.data?.basePrice).toBe(125000.5);
  });

  it("rejects thousands-separated numbers we can't parse safely", () => {
    // Explicitly document behaviour: we do not attempt to guess whether
    // `125.000,50` means 125 000.50 or 125.000 with a stray suffix. The
    // caller must clean up their columns first.
    const row = validateRows(map, [
      { code: "A4", type: "APARTMENT", totalArea: "50", basePrice: "125.000,50" },
    ])[0]!;
    expect(row.ok).toBe(false);
  });
});

describe("import template", () => {
  it("emits localized headers and sample rows that pass validation", () => {
    const csvSr = buildImportTemplateCsv("sr-Latn");
    expect(csvSr.startsWith("\uFEFF")).toBe(true);
    expect(csvSr).toContain("Šifra,Tip,Status");
    expect(csvSr).toContain("Ukupna površina");

    const csvEn = buildImportTemplateCsv("en");
    expect(csvEn).toContain("Code,Type,Status");
    expect(csvEn).toContain("Total area");

    const identityMap: HeaderMap = Object.fromEntries(
      UNIT_IMPORT_TEMPLATE_COLUMNS.map((col) => [col, col]),
    );
    const rows = validateRows(identityMap, UNIT_IMPORT_TEMPLATE_SAMPLE);
    expect(rows.every((r) => r.ok)).toBe(true);
  });
});

describe("readExportedUnitRows", () => {
  const headers = UNIT_EXPORT_COLUMNS.map((column) => column.header);

  it("reads the export headers and keeps an empty price as empty", () => {
    const result = readExportedUnitRows({
      headers,
      rows: [
        {
          "Šifra projekta": "GP",
          Projekat: "Gradnja Plus",
          Šifra: "A-01",
          "Ext. referenca": "",
          Tip: "APARTMENT",
          Status: "AVAILABLE",
          Objekat: "A",
          Ulaz: "1",
          Sprat: "1",
          Površina: "68,40",
          Bruto: "",
          "Osnovna cena": "145000",
          "Konačna cena": "",
          Valuta: "EUR",
          Sobe: "2",
          Kupatila: "1",
        },
      ],
    });
    expect(result.missingColumns).toEqual([]);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({
      row: 2,
      values: {
        projectCode: "GP",
        code: "A-01",
        totalArea: "68,40",
        finalPrice: "",
        externalReference: "",
      },
    });
  });

  it("also accepts the CSV export keys", () => {
    const result = readExportedUnitRows({
      headers: ["projectCode", "code", "basePrice"],
      rows: [{ projectCode: "GP", code: "A-01", basePrice: "1" }],
    });
    expect(result.missingColumns).toEqual([]);
    expect(result.rows[0]?.values.code).toBe("A-01");
  });

  it("reports a missing unit code column", () => {
    const result = readExportedUnitRows({
      headers: ["Šifra projekta", "Projekat"],
      rows: [{ "Šifra projekta": "GP", Projekat: "Gradnja" }],
    });
    expect(result.missingColumns).toEqual(["code"]);
  });

  it("keeps repeated codes so the importer can reject the second row", () => {
    const result = readExportedUnitRows({
      headers: ["Šifra projekta", "Šifra"],
      rows: [
        { "Šifra projekta": "GP", Šifra: "A-01" },
        { "Šifra projekta": "GP", Šifra: "A-01" },
        { "Šifra projekta": "GP", Šifra: "A-02" },
      ],
    });
    const keys = result.rows.map((row) => `${row.values.projectCode}:${row.values.code}`);
    expect(keys).toEqual(["GP:A-01", "GP:A-01", "GP:A-02"]);
  });

  it("reads an xlsx written with the export columns", async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Jedinice");
    ws.columns = UNIT_EXPORT_COLUMNS.map((column) => ({
      header: column.header,
      key: column.key,
    }));
    ws.addRow({
      projectCode: "GP",
      projectName: "Gradnja Plus",
      code: "A-01",
      type: "APARTMENT",
      status: "AVAILABLE",
      totalArea: 68.4,
      basePrice: 145000,
      currency: "EUR",
      bedrooms: 2,
    });
    const buffer = Buffer.from(await wb.xlsx.writeBuffer());
    const parsed = await parseFile("jedinice.xlsx", buffer);
    const result = readExportedUnitRows(parsed);
    expect(result.missingColumns).toEqual([]);
    expect(result.rows[0]?.values).toMatchObject({
      projectCode: "GP",
      code: "A-01",
      totalArea: "68.4",
      basePrice: "145000",
      bedrooms: "2",
    });
  });
});
