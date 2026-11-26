import "server-only";
import Papa from "papaparse";
import ExcelJS from "exceljs";
import Decimal from "decimal.js";
import type { Prisma, UnitStatus, UnitType } from "@prisma/client";

import { prisma } from "@/server/db/prisma";
import { DomainErrors } from "@/lib/errors";
import { recordAudit } from "@/server/audit/audit";
import { assertQuota } from "@/server/services/quotas.service";
import { changeUnitStatus, createUnit, updateUnit } from "@/server/services/units.service";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n";
import {
  REQUIRED_IMPORT_FIELDS,
  UNIT_IMPORT_TEMPLATE_COLUMNS,
  normalizeImportHeader,
  unitImportHeader,
  type UnitImportField,
} from "@/lib/inventory/unit-import-columns";

export {
  REQUIRED_IMPORT_FIELDS as REQUIRED_FIELDS,
  UNIT_IMPORT_TEMPLATE_COLUMNS,
  type UnitImportField,
};

/**
 * Units import & export.
 *
 * The import flow works in three logical phases so the UI can guide the
 * operator without ever writing partial data:
 *   1. `parseFile`   — decode the raw bytes into a header + rows array.
 *   2. `validateRows`— run each row against the Zod-ish rules below and
 *                     return `{ok, errors}` per row. Nothing persisted.
 *   3. `commitRows`  — transactionally create the accepted rows and emit
 *                     `unit.import_batch` audit record with counts.
 *
 * Header mapping is provided by the caller so we support arbitrary column
 * orderings and Serbian/English column names. Numeric parsing accepts
 * comma and dot decimal separators.
 */

// -----------------------------------------------------------------------------
// Header mapping
// -----------------------------------------------------------------------------

export interface HeaderMap {
  [column: string]: UnitImportField | null;
}

export const UNIT_IMPORT_TEMPLATE_SAMPLE: Record<UnitImportField, string>[] = [
  {
    code: "A-1.1",
    type: "APARTMENT",
    status: "AVAILABLE",
    buildingCode: "A",
    entranceCode: "1",
    floorLabel: "1",
    totalArea: "68.40",
    internalArea: "62.10",
    terraceArea: "6.30",
    gardenArea: "",
    basePrice: "145000",
    finalPrice: "145000",
    currency: "EUR",
    vatRate: "20",
    bedrooms: "2",
    bathrooms: "1",
    orientation: "jugoistok",
    publicDescription: "Dvosoban stan sa terasom",
    internalNotes: "",
    externalReference: "",
  },
  {
    code: "P-01",
    type: "PARKING_SPACE",
    status: "AVAILABLE",
    buildingCode: "A",
    entranceCode: "1",
    floorLabel: "Suteren",
    totalArea: "12.00",
    internalArea: "",
    terraceArea: "",
    gardenArea: "",
    basePrice: "15000",
    finalPrice: "15000",
    currency: "EUR",
    vatRate: "20",
    bedrooms: "",
    bathrooms: "",
    orientation: "",
    publicDescription: "Parking mesto",
    internalNotes: "",
    externalReference: "",
  },
];

export function buildImportTemplateCsv(locale: Locale = DEFAULT_LOCALE): string {
  const header = UNIT_IMPORT_TEMPLATE_COLUMNS.map((col) =>
    csvEscape(unitImportHeader(col, locale)),
  ).join(",");
  const lines = UNIT_IMPORT_TEMPLATE_SAMPLE.map((row) =>
    UNIT_IMPORT_TEMPLATE_COLUMNS.map((col) => csvEscape(row[col] ?? "")).join(","),
  );
  return `\uFEFF${[header, ...lines].join("\r\n")}\r\n`;
}

export async function buildImportTemplateXlsx(locale: Locale = DEFAULT_LOCALE): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(locale === "en" ? "Units" : "Jedinice");
  ws.columns = UNIT_IMPORT_TEMPLATE_COLUMNS.map((key) => {
    const header = unitImportHeader(key, locale);
    return {
      header,
      key,
      width: Math.max(14, header.length + 2),
    };
  });
  for (const row of UNIT_IMPORT_TEMPLATE_SAMPLE) {
    ws.addRow(row);
  }
  ws.getRow(1).font = { bold: true };
  const arr = await wb.xlsx.writeBuffer();
  return Buffer.from(arr);
}

function cellToString(raw: unknown): string {
  if (raw == null) return "";
  if (typeof raw === "number") return Number.isFinite(raw) ? String(raw) : "";
  if (typeof raw === "string") return raw.trim();
  if (typeof raw === "boolean") return raw ? "true" : "false";
  if (raw instanceof Date) return raw.toISOString();
  if (typeof raw === "object") {
    const obj = raw as { result?: unknown; text?: unknown; richText?: { text: string }[] };
    if ("result" in obj) return cellToString(obj.result);
    if (typeof obj.text === "string") return obj.text.trim();
    if (Array.isArray(obj.richText))
      return obj.richText
        .map((part) => part.text)
        .join("")
        .trim();
  }
  return String(raw).trim();
}

function csvEscape(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

// -----------------------------------------------------------------------------
// Parsers
// -----------------------------------------------------------------------------

export interface ParsedFile {
  headers: string[];
  rows: Record<string, string>[];
}

export async function parseFile(fileName: string, buffer: Buffer): Promise<ParsedFile> {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".csv")) return parseCsv(buffer);
  if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) return parseXlsx(buffer);
  throw DomainErrors.badRequest("Podržani formati su .csv i .xlsx");
}

function parseCsv(buffer: Buffer): ParsedFile {
  const text = buffer.toString("utf8");
  const result = Papa.parse(text, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
  });
  if (result.errors.length > 0) {
    throw DomainErrors.badRequest(`CSV nije validan: ${result.errors[0]?.message}`);
  }
  const rows = (result.data as Record<string, string>[]) ?? [];
  const headers = (result.meta.fields ?? []).map((h) => String(h).trim());
  return { headers, rows };
}

async function parseXlsx(buffer: Buffer): Promise<ParsedFile> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer as unknown as ArrayBuffer);
  const sheet = wb.worksheets[0];
  if (!sheet) {
    throw DomainErrors.badRequest("Excel fajl je prazan.");
  }
  const headerRow = sheet.getRow(1);
  const headers: string[] = [];
  headerRow.eachCell((cell, colNumber) => {
    headers[colNumber - 1] = String(cell.value ?? "").trim();
  });
  const rows: Record<string, string>[] = [];
  for (let i = 2; i <= sheet.rowCount; i += 1) {
    const row = sheet.getRow(i);
    const record: Record<string, string> = {};
    let hasValue = false;
    for (let c = 0; c < headers.length; c += 1) {
      const header = headers[c];
      if (!header) continue;
      const str = cellToString(row.getCell(c + 1).value);
      if (str) hasValue = true;
      record[header] = str;
    }
    if (hasValue) rows.push(record);
  }
  return { headers, rows };
}

// -----------------------------------------------------------------------------
// Validation
// -----------------------------------------------------------------------------

export interface ValidatedRow {
  index: number;
  raw: Record<string, string>;
  ok: boolean;
  errors: string[];
  data?: {
    code: string;
    type: UnitType;
    status: UnitStatus;
    buildingCode?: string;
    entranceCode?: string;
    floorLabel?: string;
    totalArea: number;
    internalArea?: number;
    terraceArea?: number;
    gardenArea?: number;
    basePrice: number | null;
    finalPrice?: number;
    currency: string;
    vatRate?: number;
    bedrooms?: number;
    bathrooms?: number;
    orientation?: string;
    publicDescription?: string;
    internalNotes?: string;
    externalReference?: string;
  };
}

function num(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const cleaned = value.replace(/\s/g, "").replace(",", ".");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : undefined;
}

const VALID_UNIT_TYPES = new Set<string>([
  "APARTMENT",
  "GARAGE",
  "PARKING_SPACE",
  "STORAGE",
  "COMMERCIAL",
  "HOUSE",
  "OTHER",
]);

const VALID_UNIT_STATUSES = new Set<string>([
  "AVAILABLE",
  "ON_HOLD",
  "RESERVED",
  "DEPOSIT_PAID",
  "CONTRACTED",
  "SOLD",
  "BLOCKED",
  "NOT_FOR_SALE",
]);

function pick(
  row: Record<string, string>,
  headerMap: HeaderMap,
  field: UnitImportField,
): string | undefined {
  for (const [col, mapped] of Object.entries(headerMap)) {
    if (mapped === field) {
      const value = row[col];
      return value ? value.trim() : undefined;
    }
  }
  return undefined;
}

export function validateRows(headerMap: HeaderMap, rows: Record<string, string>[]): ValidatedRow[] {
  const seenCodes = new Set<string>();
  return rows.map((raw, index) => {
    const errors: string[] = [];
    const code = pick(raw, headerMap, "code");
    if (!code) errors.push("Šifra jedinice je obavezna.");
    else if (seenCodes.has(code)) errors.push(`Duplirana šifra u fajlu: ${code}`);
    else seenCodes.add(code);

    const type = (pick(raw, headerMap, "type") ?? "").toUpperCase();
    if (!VALID_UNIT_TYPES.has(type)) errors.push(`Nepoznat tip jedinice: "${type}"`);

    const statusRaw = (pick(raw, headerMap, "status") ?? "AVAILABLE").toUpperCase();
    if (!VALID_UNIT_STATUSES.has(statusRaw)) {
      errors.push(`Nepoznat status: "${statusRaw}"`);
    }

    const totalArea = num(pick(raw, headerMap, "totalArea"));
    if (totalArea == null || totalArea <= 0)
      errors.push("Ukupna površina mora biti pozitivan broj.");

    const basePriceRaw = pick(raw, headerMap, "basePrice");
    const basePrice = num(basePriceRaw);
    if (basePriceRaw && (basePrice == null || basePrice < 0)) {
      errors.push("Osnovna cena mora biti nenegativan broj.");
    }

    const currency = (pick(raw, headerMap, "currency") ?? "EUR").toUpperCase();

    if (errors.length > 0 || code == null || totalArea == null) {
      return { index, raw, ok: false, errors };
    }

    return {
      index,
      raw,
      ok: true,
      errors,
      data: {
        code,
        type: type as UnitType,
        status: statusRaw as UnitStatus,
        buildingCode: pick(raw, headerMap, "buildingCode"),
        entranceCode: pick(raw, headerMap, "entranceCode"),
        floorLabel: pick(raw, headerMap, "floorLabel"),
        totalArea,
        internalArea: num(pick(raw, headerMap, "internalArea")),
        terraceArea: num(pick(raw, headerMap, "terraceArea")),
        gardenArea: num(pick(raw, headerMap, "gardenArea")),
        basePrice: basePrice ?? null,
        finalPrice: num(pick(raw, headerMap, "finalPrice")),
        currency,
        vatRate: num(pick(raw, headerMap, "vatRate")),
        bedrooms: num(pick(raw, headerMap, "bedrooms")),
        bathrooms: num(pick(raw, headerMap, "bathrooms")),
        orientation: pick(raw, headerMap, "orientation"),
        publicDescription: pick(raw, headerMap, "publicDescription"),
        internalNotes: pick(raw, headerMap, "internalNotes"),
        externalReference: pick(raw, headerMap, "externalReference"),
      },
    };
  });
}

// -----------------------------------------------------------------------------
// Commit
// -----------------------------------------------------------------------------

export interface CommitResult {
  created: number;
  skipped: number;
  errors: { row: number; message: string }[];
}

export async function commitRows(input: {
  organizationId: string;
  actorUserId: string;
  projectId: string;
  rows: ValidatedRow[];
}): Promise<CommitResult> {
  const rowsToInsert = input.rows.filter((r) => r.ok && r.data);
  if (rowsToInsert.length === 0) {
    return { created: 0, skipped: input.rows.length, errors: [] };
  }
  await assertQuota(input.organizationId, "units", rowsToInsert.length);

  const project = await prisma.project.findFirst({
    where: { id: input.projectId, organizationId: input.organizationId },
    select: { id: true, archivedAt: true },
  });
  if (!project) throw DomainErrors.notFound("Projekat");
  if (project.archivedAt) {
    throw DomainErrors.invalidState("Ne možete uvoziti jedinice u arhivirani projekat.");
  }

  // Preload the project's structural tree so we can resolve buildingCode /
  // entranceCode / floorLabel to IDs in a single pass with zero N+1.
  const buildings = await prisma.building.findMany({
    where: { projectId: input.projectId },
    include: {
      entrances: { include: { floors: true } },
    },
  });
  const buildingByCode = new Map(buildings.map((b) => [b.code, b]));

  const errors: { row: number; message: string }[] = [];
  const existing = await prisma.unit.findMany({
    where: {
      projectId: input.projectId,
      code: { in: rowsToInsert.map((row) => row.data!.code) },
    },
    select: { code: true },
  });
  const existingCodes = new Set(existing.map((unit) => unit.code));

  const pending: Prisma.UnitCreateManyInput[] = [];
  for (const row of rowsToInsert) {
    const data = row.data!;
    let buildingId: string | null = null;
    let entranceId: string | null = null;
    let floorId: string | null = null;
    if (data.buildingCode) {
      const building = buildingByCode.get(data.buildingCode);
      if (!building) {
        errors.push({
          row: row.index + 1,
          message: `Nepoznat objekat: ${data.buildingCode}`,
        });
        continue;
      }
      buildingId = building.id;
      if (data.entranceCode) {
        const entrance = building.entrances.find((item) => item.code === data.entranceCode);
        if (!entrance) {
          errors.push({
            row: row.index + 1,
            message: `Nepoznat ulaz: ${data.entranceCode}`,
          });
          continue;
        }
        entranceId = entrance.id;
        if (data.floorLabel) {
          const floor = entrance.floors.find((item) => item.label === data.floorLabel);
          if (!floor) {
            errors.push({
              row: row.index + 1,
              message: `Nepoznat sprat: ${data.floorLabel}`,
            });
            continue;
          }
          floorId = floor.id;
        }
      }
    }
    if (existingCodes.has(data.code)) {
      errors.push({
        row: row.index + 1,
        message: `Jedinica sa šifrom "${data.code}" već postoji.`,
      });
      continue;
    }
    const basePrice = data.basePrice != null ? new Decimal(data.basePrice) : null;
    const finalPrice = data.finalPrice != null ? new Decimal(data.finalPrice) : null;
    const totalArea = new Decimal(data.totalArea);
    const priced = finalPrice ?? basePrice;
    pending.push({
      organizationId: input.organizationId,
      projectId: input.projectId,
      buildingId,
      entranceId,
      floorId,
      code: data.code,
      externalReference: data.externalReference ?? null,
      type: data.type,
      status: data.status,
      totalArea,
      internalArea: data.internalArea != null ? new Decimal(data.internalArea) : null,
      terraceArea: data.terraceArea != null ? new Decimal(data.terraceArea) : null,
      gardenArea: data.gardenArea != null ? new Decimal(data.gardenArea) : null,
      basePrice,
      finalPrice,
      pricePerSquareMeter:
        priced && !totalArea.isZero() ? priced.div(totalArea).toDecimalPlaces(2) : null,
      currency: data.currency,
      vatRate: data.vatRate != null ? new Decimal(data.vatRate) : null,
      bedrooms: data.bedrooms != null ? Math.trunc(data.bedrooms) : null,
      bathrooms: data.bathrooms != null ? Math.trunc(data.bathrooms) : null,
      orientation: data.orientation ?? null,
      publicDescription: data.publicDescription ?? null,
      internalNotes: data.internalNotes ?? null,
    });
  }

  let created = 0;
  if (pending.length > 0) {
    const inserted = await prisma.unit.createMany({ data: pending });
    created = inserted.count;
  }

  await recordAudit({
    action: "unit.import_batch",
    entityType: "UnitImportBatch",
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    newValues: {
      projectId: input.projectId,
      created,
      skipped: input.rows.length - created,
      errors: errors.length,
    },
  });

  return {
    created,
    skipped: input.rows.length - created,
    errors,
  };
}

// -----------------------------------------------------------------------------
// Export
// -----------------------------------------------------------------------------

export async function exportUnitsCsv(organizationId: string, projectId?: string): Promise<string> {
  const units = await prisma.unit.findMany({
    where: { organizationId, ...(projectId ? { projectId } : {}) },
    include: {
      project: { select: { code: true, name: true } },
      building: { select: { code: true } },
      entrance: { select: { code: true } },
      floor: { select: { label: true } },
    },
    orderBy: [{ projectId: "asc" }, { code: "asc" }],
  });
  const rows = units.map((u) => ({
    projectCode: u.project.code,
    projectName: u.project.name,
    code: u.code,
    externalReference: u.externalReference ?? "",
    type: u.type,
    status: u.status,
    buildingCode: u.building?.code ?? "",
    entranceCode: u.entrance?.code ?? "",
    floorLabel: u.floor?.label ?? "",
    totalArea: u.totalArea.toString(),
    internalArea: u.internalArea?.toString() ?? "",
    basePrice: u.basePrice?.toString() ?? "",
    finalPrice: u.finalPrice?.toString() ?? "",
    currency: u.currency,
    bedrooms: u.bedrooms?.toString() ?? "",
    bathrooms: u.bathrooms?.toString() ?? "",
  }));
  return Papa.unparse(rows, { header: true });
}

export async function exportUnitsXlsx(organizationId: string, projectId?: string): Promise<Buffer> {
  const units = await prisma.unit.findMany({
    where: { organizationId, ...(projectId ? { projectId } : {}) },
    include: {
      project: { select: { code: true, name: true } },
      building: { select: { code: true } },
      entrance: { select: { code: true } },
      floor: { select: { label: true } },
    },
    orderBy: [{ projectId: "asc" }, { code: "asc" }],
  });
  const wb = new ExcelJS.Workbook();
  wb.creator = "PropertyDesk";
  const ws = wb.addWorksheet("Jedinice");
  ws.columns = UNIT_EXPORT_COLUMNS.map((column) => ({
    header: column.header,
    key: column.key,
    width: column.width,
  }));
  for (const u of units) {
    ws.addRow({
      projectCode: u.project.code,
      projectName: u.project.name,
      code: u.code,
      externalReference: u.externalReference ?? "",
      type: u.type,
      status: u.status,
      buildingCode: u.building?.code ?? "",
      entranceCode: u.entrance?.code ?? "",
      floorLabel: u.floor?.label ?? "",
      totalArea: Number(u.totalArea),
      internalArea: u.internalArea ? Number(u.internalArea) : "",
      basePrice: u.basePrice != null ? Number(u.basePrice) : "",
      finalPrice: u.finalPrice ? Number(u.finalPrice) : "",
      currency: u.currency,
      bedrooms: u.bedrooms ?? "",
      bathrooms: u.bathrooms ?? "",
    });
  }
  ws.getRow(1).font = { bold: true };
  const arr = await wb.xlsx.writeBuffer();
  return Buffer.from(arr);
}

// -----------------------------------------------------------------------------
// Round-trip import of an exported sheet
// -----------------------------------------------------------------------------

/**
 * Columns written by the units export. The import reads this exact shape:
 * the same headers, one row per unit.
 */
export const UNIT_EXPORT_COLUMNS = [
  { key: "projectCode", header: "Šifra projekta", width: 15 },
  { key: "projectName", header: "Projekat", width: 22 },
  { key: "code", header: "Šifra", width: 12 },
  { key: "externalReference", header: "Ext. referenca", width: 16 },
  { key: "type", header: "Tip", width: 14 },
  { key: "status", header: "Status", width: 14 },
  { key: "buildingCode", header: "Objekat", width: 10 },
  { key: "entranceCode", header: "Ulaz", width: 10 },
  { key: "floorLabel", header: "Sprat", width: 10 },
  { key: "totalArea", header: "Površina", width: 12 },
  { key: "internalArea", header: "Bruto", width: 12 },
  { key: "basePrice", header: "Osnovna cena", width: 15 },
  { key: "finalPrice", header: "Konačna cena", width: 15 },
  { key: "currency", header: "Valuta", width: 10 },
  { key: "bedrooms", header: "Sobe", width: 8 },
  { key: "bathrooms", header: "Kupatila", width: 8 },
] as const;

export type ExportUnitField = (typeof UNIT_EXPORT_COLUMNS)[number]["key"];

const EXPORT_HEADER_ALIASES: Record<string, ExportUnitField> = {};
for (const column of UNIT_EXPORT_COLUMNS) {
  EXPORT_HEADER_ALIASES[normalizeImportHeader(column.header)] = column.key;
  EXPORT_HEADER_ALIASES[normalizeImportHeader(column.key)] = column.key;
}

export interface ExportSheetRow {
  /** 1-based spreadsheet row (header is row 1). */
  row: number;
  values: Partial<Record<ExportUnitField, string>>;
}

const EXPORT_IMPORT_REQUIRED: ExportUnitField[] = ["projectCode", "code"];
const EXPORT_IMPORT_PRICE_REASON = "Uvoz iz tabele";
const EXPORT_IMPORT_MAX_ROWS = 5000;

export function readExportedUnitRows(parsed: ParsedFile): {
  rows: ExportSheetRow[];
  missingColumns: ExportUnitField[];
} {
  const present = new Set<ExportUnitField>();
  const headerFields = parsed.headers.map((header) => {
    const field = EXPORT_HEADER_ALIASES[normalizeImportHeader(header)];
    if (field) present.add(field);
    return field ?? null;
  });
  const missingColumns = EXPORT_IMPORT_REQUIRED.filter((field) => !present.has(field));
  const rows: ExportSheetRow[] = [];
  parsed.rows.forEach((raw, index) => {
    const values: Partial<Record<ExportUnitField, string>> = {};
    let hasValue = false;
    parsed.headers.forEach((header, column) => {
      const field = headerFields[column];
      if (!field || field in values) return;
      const value = (raw[header] ?? "").trim();
      if (value) hasValue = true;
      values[field] = value;
    });
    if (hasValue) rows.push({ row: index + 2, values });
  });
  return { rows, missingColumns };
}

export interface UnitExportImportResult {
  updated: number;
  created: number;
  unchanged: number;
  errors: { row: number; message: string }[];
}

type BuildingTree = {
  id: string;
  code: string;
  entrances: { id: string; code: string; floors: { id: string; label: string }[] }[];
};

function sameMoney(stored: { toString(): string } | null | undefined, incoming: number | null) {
  if (stored == null && incoming == null) return true;
  if (stored == null || incoming == null) return false;
  return new Decimal(stored.toString())
    .toDecimalPlaces(2)
    .eq(new Decimal(incoming).toDecimalPlaces(2));
}

function optionalNumber(
  raw: string | undefined,
  label: string,
  { min, integer }: { min: number; integer?: boolean },
): { ok: true; value: number | null } | { ok: false; message: string } {
  if (!raw) return { ok: true, value: null };
  const parsed = num(raw);
  if (parsed == null || parsed < min || (integer && !Number.isInteger(parsed))) {
    return {
      ok: false,
      message: integer
        ? `${label} mora biti ceo broj.`
        : `${label} mora biti ${min > 0 ? "pozitivan" : "nenegativan"} broj.`,
    };
  }
  return { ok: true, value: parsed };
}

function resolveStructure(
  buildings: BuildingTree[],
  buildingCode: string,
  entranceCode: string,
  floorLabel: string,
):
  | { ok: true; buildingId: string | null; entranceId: string | null; floorId: string | null }
  | { ok: false; message: string } {
  if (!buildingCode) {
    if (entranceCode || floorLabel) {
      return { ok: false, message: "Ulaz i sprat traže šifru objekta." };
    }
    return { ok: true, buildingId: null, entranceId: null, floorId: null };
  }
  const building = buildings.find((item) => item.code === buildingCode);
  if (!building) return { ok: false, message: `Nepoznat objekat: ${buildingCode}` };
  if (!entranceCode) {
    if (floorLabel) return { ok: false, message: "Sprat traži šifru ulaza." };
    return { ok: true, buildingId: building.id, entranceId: null, floorId: null };
  }
  const entrance = building.entrances.find((item) => item.code === entranceCode);
  if (!entrance) return { ok: false, message: `Nepoznat ulaz: ${entranceCode}` };
  if (!floorLabel) {
    return { ok: true, buildingId: building.id, entranceId: entrance.id, floorId: null };
  }
  const floor = entrance.floors.find((item) => item.label === floorLabel);
  if (!floor) return { ok: false, message: `Nepoznat sprat: ${floorLabel}` };
  return { ok: true, buildingId: building.id, entranceId: entrance.id, floorId: floor.id };
}

/**
 * Apply a file produced by the units export. A row matches on project code
 * plus unit code: an existing unit is updated, a new code is created.
 */
export async function importExportedUnits(input: {
  organizationId: string;
  actorUserId: string;
  fileName: string;
  buffer: Buffer;
}): Promise<UnitExportImportResult> {
  if (input.buffer.byteLength > 5 * 1024 * 1024) {
    throw DomainErrors.badRequest("Fajl je veći od 5 MB.");
  }
  const parsed = await parseFile(input.fileName, input.buffer);
  const { rows, missingColumns } = readExportedUnitRows(parsed);
  if (missingColumns.length > 0) {
    const labels = missingColumns.map(
      (field) => UNIT_EXPORT_COLUMNS.find((column) => column.key === field)?.header ?? field,
    );
    throw DomainErrors.badRequest(`Nedostaju kolone: ${labels.join(", ")}.`);
  }
  if (rows.length === 0) throw DomainErrors.badRequest("Fajl nema nijedan red.");
  if (rows.length > EXPORT_IMPORT_MAX_ROWS) {
    throw DomainErrors.badRequest(`Najviše ${EXPORT_IMPORT_MAX_ROWS} redova po uvozu.`);
  }

  const seen = new Set<string>();
  const errors: { row: number; message: string }[] = [];
  const accepted: ExportSheetRow[] = [];
  for (const row of rows) {
    const projectCode = row.values.projectCode?.trim() ?? "";
    const code = row.values.code?.trim() ?? "";
    if (!projectCode) {
      errors.push({ row: row.row, message: "Šifra projekta je obavezna." });
      continue;
    }
    if (!code) {
      errors.push({ row: row.row, message: "Šifra jedinice je obavezna." });
      continue;
    }
    const key = `${projectCode}\u0000${code}`;
    if (seen.has(key)) {
      errors.push({
        row: row.row,
        message: `Duplirana šifra u fajlu: ${code} (${projectCode}).`,
      });
      continue;
    }
    seen.add(key);
    accepted.push(row);
  }

  const projectCodes = [...new Set(accepted.map((row) => row.values.projectCode!))];
  const projects = await prisma.project.findMany({
    where: { organizationId: input.organizationId, code: { in: projectCodes } },
    select: { id: true, code: true, archivedAt: true },
  });
  const projectByCode = new Map(projects.map((project) => [project.code, project]));
  const projectIds = projects.map((project) => project.id);

  const [units, buildings] = await Promise.all([
    prisma.unit.findMany({
      where: { organizationId: input.organizationId, projectId: { in: projectIds } },
      select: {
        id: true,
        projectId: true,
        code: true,
        type: true,
        status: true,
        buildingId: true,
        entranceId: true,
        floorId: true,
        externalReference: true,
        totalArea: true,
        internalArea: true,
        basePrice: true,
        finalPrice: true,
        currency: true,
        bedrooms: true,
        bathrooms: true,
      },
    }),
    prisma.building.findMany({
      where: { projectId: { in: projectIds } },
      select: {
        id: true,
        projectId: true,
        code: true,
        entrances: {
          select: { id: true, code: true, floors: { select: { id: true, label: true } } },
        },
      },
    }),
  ]);
  const unitByKey = new Map(units.map((unit) => [`${unit.projectId}\u0000${unit.code}`, unit]));
  const buildingsByProject = new Map<string, BuildingTree[]>();
  for (const building of buildings) {
    const list = buildingsByProject.get(building.projectId) ?? [];
    list.push(building);
    buildingsByProject.set(building.projectId, list);
  }

  const creates = accepted.filter((row) => {
    const project = projectByCode.get(row.values.projectCode!);
    return project && !unitByKey.has(`${project.id}\u0000${row.values.code}`);
  });
  if (creates.length > 0) await assertQuota(input.organizationId, "units", creates.length);

  let updated = 0;
  let created = 0;
  let unchanged = 0;

  for (const row of accepted) {
    const project = projectByCode.get(row.values.projectCode!);
    if (!project) {
      errors.push({ row: row.row, message: `Nepoznat projekat: ${row.values.projectCode}` });
      continue;
    }
    if (project.archivedAt) {
      errors.push({ row: row.row, message: "Projekat je arhiviran." });
      continue;
    }
    const values = row.values;
    const existing = unitByKey.get(`${project.id}\u0000${values.code}`);

    const typeRaw = (values.type ?? "").toUpperCase();
    if (values.type !== undefined && typeRaw && !VALID_UNIT_TYPES.has(typeRaw)) {
      errors.push({ row: row.row, message: `Nepoznat tip jedinice: "${values.type}"` });
      continue;
    }
    const statusRaw = (values.status ?? "").toUpperCase();
    if (values.status !== undefined && statusRaw && !VALID_UNIT_STATUSES.has(statusRaw)) {
      errors.push({ row: row.row, message: `Nepoznat status: "${values.status}"` });
      continue;
    }

    const totalArea =
      values.totalArea !== undefined
        ? optionalNumber(values.totalArea, "Površina", { min: 0.01 })
        : null;
    if (totalArea && !totalArea.ok) {
      errors.push({ row: row.row, message: totalArea.message });
      continue;
    }
    const internalArea =
      values.internalArea !== undefined
        ? optionalNumber(values.internalArea, "Bruto", { min: 0 })
        : null;
    if (internalArea && !internalArea.ok) {
      errors.push({ row: row.row, message: internalArea.message });
      continue;
    }
    const basePrice =
      values.basePrice !== undefined
        ? optionalNumber(values.basePrice, "Osnovna cena", { min: 0 })
        : null;
    if (basePrice && !basePrice.ok) {
      errors.push({ row: row.row, message: basePrice.message });
      continue;
    }
    const finalPrice =
      values.finalPrice !== undefined
        ? optionalNumber(values.finalPrice, "Konačna cena", { min: 0 })
        : null;
    if (finalPrice && !finalPrice.ok) {
      errors.push({ row: row.row, message: finalPrice.message });
      continue;
    }
    const bedrooms =
      values.bedrooms !== undefined
        ? optionalNumber(values.bedrooms, "Sobe", { min: 0, integer: true })
        : null;
    if (bedrooms && !bedrooms.ok) {
      errors.push({ row: row.row, message: bedrooms.message });
      continue;
    }
    const bathrooms =
      values.bathrooms !== undefined
        ? optionalNumber(values.bathrooms, "Kupatila", { min: 0, integer: true })
        : null;
    if (bathrooms && !bathrooms.ok) {
      errors.push({ row: row.row, message: bathrooms.message });
      continue;
    }

    const currency = values.currency ? values.currency.toUpperCase() : "";
    if (currency && currency !== "EUR" && currency !== "RSD") {
      errors.push({ row: row.row, message: "Valuta mora biti EUR ili RSD." });
      continue;
    }

    let structure:
      { buildingId: string | null; entranceId: string | null; floorId: string | null } | undefined;
    if (
      values.buildingCode !== undefined ||
      values.entranceCode !== undefined ||
      values.floorLabel !== undefined
    ) {
      const resolved = resolveStructure(
        buildingsByProject.get(project.id) ?? [],
        values.buildingCode ?? "",
        values.entranceCode ?? "",
        values.floorLabel ?? "",
      );
      if (!resolved.ok) {
        errors.push({ row: row.row, message: resolved.message });
        continue;
      }
      structure = resolved;
    }

    if (!existing) {
      if (!typeRaw || !totalArea || totalArea.value == null) {
        errors.push({
          row: row.row,
          message: "Nova jedinica traži tip i površinu.",
        });
        continue;
      }
      if (values.code!.length > 40) {
        errors.push({ row: row.row, message: "Šifra jedinice može imati najviše 40 karaktera." });
        continue;
      }
      try {
        await createUnit({
          organizationId: input.organizationId,
          actorUserId: input.actorUserId,
          projectId: project.id,
          code: values.code!,
          type: typeRaw as UnitType,
          status: (statusRaw || "AVAILABLE") as UnitStatus,
          buildingId: structure?.buildingId ?? null,
          entranceId: structure?.entranceId ?? null,
          floorId: structure?.floorId ?? null,
          totalArea: totalArea.value,
          internalArea: internalArea?.ok ? internalArea.value : null,
          basePrice: basePrice?.ok ? basePrice.value : null,
          finalPrice: finalPrice?.ok ? finalPrice.value : null,
          currency: currency || "EUR",
          bedrooms: bedrooms?.ok ? bedrooms.value : null,
          bathrooms: bathrooms?.ok ? bathrooms.value : null,
          externalReference: values.externalReference || null,
        });
        created += 1;
      } catch (err) {
        errors.push({
          row: row.row,
          message: err instanceof Error ? err.message : "Jedinica nije kreirana.",
        });
      }
      continue;
    }

    const patch: Parameters<typeof updateUnit>[0]["patch"] = {};
    if (typeRaw && typeRaw !== existing.type) patch.type = typeRaw as UnitType;
    if (
      totalArea?.ok &&
      totalArea.value != null &&
      !sameMoney(existing.totalArea, totalArea.value)
    ) {
      patch.totalArea = totalArea.value;
    }
    if (internalArea?.ok && !sameMoney(existing.internalArea, internalArea.value)) {
      patch.internalArea = internalArea.value;
    }
    if (
      basePrice?.ok &&
      basePrice.value != null &&
      !sameMoney(existing.basePrice, basePrice.value)
    ) {
      patch.basePrice = basePrice.value;
    }
    if (finalPrice?.ok && !sameMoney(existing.finalPrice, finalPrice.value)) {
      patch.finalPrice = finalPrice.value;
    }
    if (currency && currency !== existing.currency) patch.currency = currency;
    if (bedrooms?.ok && bedrooms.value !== existing.bedrooms) patch.bedrooms = bedrooms.value;
    if (bathrooms?.ok && bathrooms.value !== existing.bathrooms) patch.bathrooms = bathrooms.value;
    if (
      values.externalReference !== undefined &&
      (values.externalReference || null) !== (existing.externalReference || null)
    ) {
      patch.externalReference = values.externalReference || null;
    }
    if (
      structure &&
      (structure.buildingId !== existing.buildingId ||
        structure.entranceId !== existing.entranceId ||
        structure.floorId !== existing.floorId)
    ) {
      patch.buildingId = structure.buildingId;
      patch.entranceId = structure.entranceId;
      patch.floorId = structure.floorId;
    }

    const priceChanged = patch.basePrice != null || patch.finalPrice !== undefined;
    let wrote = false;
    if (Object.keys(patch).length > 0) {
      try {
        await updateUnit({
          organizationId: input.organizationId,
          actorUserId: input.actorUserId,
          unitId: existing.id,
          patch,
          priceChangeReason: priceChanged ? EXPORT_IMPORT_PRICE_REASON : undefined,
        });
        wrote = true;
      } catch (err) {
        errors.push({
          row: row.row,
          message: err instanceof Error ? err.message : "Jedinica nije ažurirana.",
        });
        continue;
      }
    }

    if (statusRaw && statusRaw !== existing.status) {
      try {
        await changeUnitStatus({
          organizationId: input.organizationId,
          actorUserId: input.actorUserId,
          unitId: existing.id,
          newStatus: statusRaw as UnitStatus,
          reason: EXPORT_IMPORT_PRICE_REASON,
        });
        wrote = true;
      } catch (err) {
        errors.push({
          row: row.row,
          message: err instanceof Error ? err.message : "Status nije promenjen.",
        });
      }
    }

    if (wrote) updated += 1;
    else unchanged += 1;
  }

  await recordAudit({
    action: "unit.import_batch",
    entityType: "UnitImportBatch",
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    newValues: { created, updated, unchanged, errors: errors.length, source: "export" },
  });

  return { updated, created, unchanged, errors };
}
