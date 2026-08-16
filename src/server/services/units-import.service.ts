import "server-only";
import Papa from "papaparse";
import ExcelJS from "exceljs";
import Decimal from "decimal.js";
import type { UnitStatus, UnitType } from "@prisma/client";

import { prisma } from "@/server/db/prisma";
import { DomainErrors } from "@/lib/errors";
import { recordAudit } from "@/server/audit/audit";
import { assertQuota } from "@/server/services/quotas.service";

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

export type UnitImportField =
  | "code"
  | "type"
  | "status"
  | "buildingCode"
  | "entranceCode"
  | "floorLabel"
  | "totalArea"
  | "internalArea"
  | "terraceArea"
  | "gardenArea"
  | "basePrice"
  | "finalPrice"
  | "currency"
  | "vatRate"
  | "bedrooms"
  | "bathrooms"
  | "orientation"
  | "publicDescription"
  | "internalNotes"
  | "externalReference";

export interface HeaderMap {
  [column: string]: UnitImportField | null;
}

export const REQUIRED_FIELDS: UnitImportField[] = [
  "code",
  "type",
  "totalArea",
  "basePrice",
];

/** Canonical column order for the downloadable import template. */
export const UNIT_IMPORT_TEMPLATE_COLUMNS: UnitImportField[] = [
  "code",
  "type",
  "status",
  "buildingCode",
  "entranceCode",
  "floorLabel",
  "totalArea",
  "internalArea",
  "terraceArea",
  "gardenArea",
  "basePrice",
  "finalPrice",
  "currency",
  "vatRate",
  "bedrooms",
  "bathrooms",
  "orientation",
  "publicDescription",
  "internalNotes",
  "externalReference",
];

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

export function buildImportTemplateCsv(): string {
  const header = UNIT_IMPORT_TEMPLATE_COLUMNS.join(",");
  const lines = UNIT_IMPORT_TEMPLATE_SAMPLE.map((row) =>
    UNIT_IMPORT_TEMPLATE_COLUMNS.map((col) => csvEscape(row[col] ?? "")).join(
      ",",
    ),
  );
  return `\uFEFF${[header, ...lines].join("\r\n")}\r\n`;
}

export async function buildImportTemplateXlsx(): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Jedinice");
  ws.columns = UNIT_IMPORT_TEMPLATE_COLUMNS.map((key) => ({
    header: key,
    key,
    width: Math.max(14, key.length + 2),
  }));
  for (const row of UNIT_IMPORT_TEMPLATE_SAMPLE) {
    ws.addRow(row);
  }
  ws.getRow(1).font = { bold: true };
  const arr = await wb.xlsx.writeBuffer();
  return Buffer.from(arr);
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

export async function parseFile(
  fileName: string,
  buffer: Buffer,
): Promise<ParsedFile> {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".csv")) return parseCsv(buffer);
  if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) return parseXlsx(buffer);
  throw DomainErrors.badRequest(
    "Podržani formati su .csv i .xlsx",
  );
}

function parseCsv(buffer: Buffer): ParsedFile {
  const text = buffer.toString("utf8");
  const result = Papa.parse(text, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
  });
  if (result.errors.length > 0) {
    throw DomainErrors.badRequest(
      `CSV nije validan: ${result.errors[0]?.message}`,
    );
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
      const raw = row.getCell(c + 1).value;
      const str = raw == null ? "" : String(raw).trim();
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
    basePrice: number;
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

export function validateRows(
  headerMap: HeaderMap,
  rows: Record<string, string>[],
): ValidatedRow[] {
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
    if (totalArea == null || totalArea <= 0) errors.push("Ukupna površina mora biti pozitivan broj.");

    const basePrice = num(pick(raw, headerMap, "basePrice"));
    if (basePrice == null || basePrice < 0) errors.push("Osnovna cena mora biti nenegativan broj.");

    const currency = (pick(raw, headerMap, "currency") ?? "EUR").toUpperCase();

    if (errors.length > 0 || code == null || totalArea == null || basePrice == null) {
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
        basePrice,
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
    throw DomainErrors.invalidState(
      "Ne možete uvoziti jedinice u arhivirani projekat.",
    );
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
  let created = 0;

  await prisma.$transaction(async (tx) => {
    for (const row of rowsToInsert) {
      const data = row.data!;
      let buildingId: string | null = null;
      let entranceId: string | null = null;
      let floorId: string | null = null;
      if (data.buildingCode) {
        const b = buildingByCode.get(data.buildingCode);
        if (!b) {
          errors.push({
            row: row.index + 1,
            message: `Nepoznat objekat: ${data.buildingCode}`,
          });
          continue;
        }
        buildingId = b.id;
        if (data.entranceCode) {
          const e = b.entrances.find((x) => x.code === data.entranceCode);
          if (!e) {
            errors.push({
              row: row.index + 1,
              message: `Nepoznat ulaz: ${data.entranceCode}`,
            });
            continue;
          }
          entranceId = e.id;
          if (data.floorLabel) {
            const f = e.floors.find((x) => x.label === data.floorLabel);
            if (!f) {
              errors.push({
                row: row.index + 1,
                message: `Nepoznat sprat: ${data.floorLabel}`,
              });
              continue;
            }
            floorId = f.id;
          }
        }
      }
      const dup = await tx.unit.findFirst({
        where: { projectId: input.projectId, code: data.code },
        select: { id: true },
      });
      if (dup) {
        errors.push({
          row: row.index + 1,
          message: `Jedinica sa šifrom "${data.code}" već postoji.`,
        });
        continue;
      }
      const basePrice = new Decimal(data.basePrice);
      const finalPrice = data.finalPrice != null ? new Decimal(data.finalPrice) : null;
      const totalArea = new Decimal(data.totalArea);
      const ppsm =
        finalPrice && !totalArea.isZero()
          ? finalPrice.div(totalArea).toDecimalPlaces(2)
          : basePrice.div(totalArea).toDecimalPlaces(2);
      await tx.unit.create({
        data: {
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
          pricePerSquareMeter: ppsm,
          currency: data.currency,
          vatRate: data.vatRate != null ? new Decimal(data.vatRate) : null,
          bedrooms: data.bedrooms ?? null,
          bathrooms: data.bathrooms ?? null,
          orientation: data.orientation ?? null,
          publicDescription: data.publicDescription ?? null,
          internalNotes: data.internalNotes ?? null,
        },
      });
      created += 1;
    }
  });

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

export async function exportUnitsCsv(
  organizationId: string,
  projectId?: string,
): Promise<string> {
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
    basePrice: u.basePrice.toString(),
    finalPrice: u.finalPrice?.toString() ?? "",
    currency: u.currency,
    bedrooms: u.bedrooms?.toString() ?? "",
    bathrooms: u.bathrooms?.toString() ?? "",
  }));
  return Papa.unparse(rows, { header: true });
}

export async function exportUnitsXlsx(
  organizationId: string,
  projectId?: string,
): Promise<Buffer> {
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
  ws.columns = [
    { header: "Šifra projekta", key: "projectCode", width: 15 },
    { header: "Projekat", key: "projectName", width: 22 },
    { header: "Šifra", key: "code", width: 12 },
    { header: "Ext. referenca", key: "externalReference", width: 16 },
    { header: "Tip", key: "type", width: 14 },
    { header: "Status", key: "status", width: 14 },
    { header: "Objekat", key: "buildingCode", width: 10 },
    { header: "Ulaz", key: "entranceCode", width: 10 },
    { header: "Sprat", key: "floorLabel", width: 10 },
    { header: "Površina", key: "totalArea", width: 12 },
    { header: "Bruto", key: "internalArea", width: 12 },
    { header: "Osnovna cena", key: "basePrice", width: 15 },
    { header: "Konačna cena", key: "finalPrice", width: 15 },
    { header: "Valuta", key: "currency", width: 10 },
    { header: "Sobe", key: "bedrooms", width: 8 },
    { header: "Kupatila", key: "bathrooms", width: 8 },
  ];
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
      basePrice: Number(u.basePrice),
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
