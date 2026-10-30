import "server-only";
import Papa from "papaparse";
import ExcelJS from "exceljs";
import type { ManagedUnitType, ManagedPersonRole } from "@prisma/client";

import { prisma } from "@/server/db/prisma";
import { DomainErrors } from "@/lib/errors";
import { recordAudit } from "@/server/audit/audit";
import { assertQuota } from "@/server/services/quotas.service";

/**
 * Faza 11 — XLSX / CSV import za posebne delove i vlasnike jedne zgrade.
 *
 * Mirror of `units-import.service.ts` ali za MANAGER modul. Jedna zgrada po
 * uvozu. Svaki red = jedan posebni deo + jedan primarni vlasnik (opciono).
 * Dodatni vlasnici dodaju se ručno iz UI-a posle uvoza.
 */

export const MANAGER_UNIT_IMPORT_COLUMNS = [
  "code",
  "type",
  "entranceCode",
  "floor",
  "totalArea",
  "participationShare",
  "roomCount",
  "ownerFirstName",
  "ownerLastName",
  "ownerLegalName",
  "ownerEmail",
  "ownerPhone",
  "ownerRole",
  "notes",
] as const;

export type ManagerUnitImportField = (typeof MANAGER_UNIT_IMPORT_COLUMNS)[number];

export const MANAGER_UNIT_IMPORT_HEADER_SR: Record<ManagerUnitImportField, string> = {
  code: "Oznaka dela",
  type: "Tip (APARTMENT, COMMERCIAL, GARAGE, PARKING_SPACE, STORAGE, OFFICE, OTHER)",
  entranceCode: "Ulaz",
  floor: "Sprat",
  totalArea: "Površina (m2)",
  participationShare: "Udeo (koeficijent)",
  roomCount: "Broj soba",
  ownerFirstName: "Vlasnik - ime",
  ownerLastName: "Vlasnik - prezime",
  ownerLegalName: "Vlasnik - pravno lice",
  ownerEmail: "Vlasnik - email",
  ownerPhone: "Vlasnik - telefon",
  ownerRole: "Uloga (OWNER, TENANT, USER)",
  notes: "Napomena",
};

const SAMPLE_ROW: Record<ManagerUnitImportField, string> = {
  code: "Stan 1",
  type: "APARTMENT",
  entranceCode: "A",
  floor: "1",
  totalArea: "72.50",
  participationShare: "1",
  roomCount: "3",
  ownerFirstName: "Marko",
  ownerLastName: "Marković",
  ownerLegalName: "",
  ownerEmail: "marko@example.rs",
  ownerPhone: "+381 60 000 0000",
  ownerRole: "OWNER",
  notes: "",
};

export async function buildManagerUnitTemplateXlsx(): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Posebni delovi");
  ws.columns = MANAGER_UNIT_IMPORT_COLUMNS.map((key) => ({
    header: MANAGER_UNIT_IMPORT_HEADER_SR[key],
    key,
    width: Math.max(16, MANAGER_UNIT_IMPORT_HEADER_SR[key].length + 2),
  }));
  ws.addRow(SAMPLE_ROW);
  ws.getRow(1).font = { bold: true };
  const arr = await wb.xlsx.writeBuffer();
  return Buffer.from(arr);
}

interface ParsedFile {
  headers: string[];
  rows: Record<string, string>[];
}

export async function parseManagerUnitsFile(fileName: string, buffer: Buffer): Promise<ParsedFile> {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".csv")) {
    const result = Papa.parse(buffer.toString("utf8"), {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,
    });
    if (result.errors.length > 0) {
      throw DomainErrors.badRequest(`CSV nije validan: ${result.errors[0]?.message}`);
    }
    return {
      headers: (result.meta.fields ?? []).map((h) => String(h).trim()),
      rows: (result.data as Record<string, string>[]) ?? [],
    };
  }
  if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buffer as unknown as ArrayBuffer);
    const sheet = wb.worksheets[0];
    if (!sheet) throw DomainErrors.badRequest("Excel fajl je prazan.");
    const headerRow = sheet.getRow(1);
    const headers: string[] = [];
    headerRow.eachCell((cell, col) => {
      headers[col - 1] = String(cell.value ?? "").trim();
    });
    const rows: Record<string, string>[] = [];
    for (let i = 2; i <= sheet.rowCount; i += 1) {
      const row = sheet.getRow(i);
      const record: Record<string, string> = {};
      let hasValue = false;
      for (let c = 0; c < headers.length; c += 1) {
        const h = headers[c];
        if (!h) continue;
        const raw = row.getCell(c + 1).value;
        const str = raw == null ? "" : String(raw).trim();
        if (str) hasValue = true;
        record[h] = str;
      }
      if (hasValue) rows.push(record);
    }
    return { headers, rows };
  }
  throw DomainErrors.badRequest("Podržani formati su .csv i .xlsx");
}

interface ValidatedRow {
  index: number;
  raw: Record<string, string>;
  ok: boolean;
  errors: string[];
  data?: {
    code: string;
    type: ManagedUnitType;
    entranceCode?: string;
    floor?: number;
    totalArea: number;
    participationShare?: number;
    roomCount?: number;
    owner?: {
      firstName?: string;
      lastName?: string;
      legalName?: string;
      email?: string;
      phone?: string;
      role: ManagedPersonRole;
    };
    notes?: string;
  };
}

const UNIT_TYPES: ManagedUnitType[] = [
  "APARTMENT",
  "COMMERCIAL",
  "GARAGE",
  "PARKING_SPACE",
  "STORAGE",
  "OFFICE",
  "OTHER",
];
const OWNER_ROLES: ManagedPersonRole[] = ["OWNER", "TENANT", "USER"];

function num(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function validateManagerUnitRows(
  rows: Record<string, string>[],
  headerMap: Record<string, ManagerUnitImportField | null>,
): ValidatedRow[] {
  return rows.map((raw, index) => {
    const row: ValidatedRow = { index, raw, ok: true, errors: [] };
    const get = (field: ManagerUnitImportField): string | undefined => {
      for (const [col, mapped] of Object.entries(headerMap)) {
        if (mapped === field) return raw[col]?.trim();
      }
      return undefined;
    };

    const code = get("code");
    if (!code) {
      row.ok = false;
      row.errors.push("Oznaka dela je obavezna.");
    }
    const typeRaw = (get("type") || "APARTMENT").toUpperCase();
    const type = UNIT_TYPES.includes(typeRaw as ManagedUnitType)
      ? (typeRaw as ManagedUnitType)
      : null;
    if (!type) {
      row.ok = false;
      row.errors.push(`Nepoznat tip: ${typeRaw}.`);
    }
    const totalArea = num(get("totalArea"));
    if (totalArea == null || totalArea <= 0) {
      row.ok = false;
      row.errors.push("Površina mora biti pozitivan broj.");
    }
    const participationShare = num(get("participationShare"));
    const roomCount = num(get("roomCount"));
    const floor = num(get("floor"));
    const ownerFirstName = get("ownerFirstName");
    const ownerLastName = get("ownerLastName");
    const ownerLegalName = get("ownerLegalName");
    const ownerEmail = get("ownerEmail");
    const ownerPhone = get("ownerPhone");
    const ownerRoleRaw = (get("ownerRole") || "OWNER").toUpperCase();
    const ownerRole = OWNER_ROLES.includes(ownerRoleRaw as ManagedPersonRole)
      ? (ownerRoleRaw as ManagedPersonRole)
      : "OWNER";

    if (!row.ok || !code || !type || totalArea == null) return row;

    row.data = {
      code,
      type,
      entranceCode: get("entranceCode"),
      floor: floor != null ? Math.round(floor) : undefined,
      totalArea,
      participationShare: participationShare ?? undefined,
      roomCount: roomCount ?? undefined,
      owner:
        ownerFirstName || ownerLastName || ownerLegalName
          ? {
              firstName: ownerFirstName || undefined,
              lastName: ownerLastName || undefined,
              legalName: ownerLegalName || undefined,
              email: ownerEmail || undefined,
              phone: ownerPhone || undefined,
              role: ownerRole,
            }
          : undefined,
      notes: get("notes") || undefined,
    };
    return row;
  });
}

export async function commitManagerUnitRows(input: {
  organizationId: string;
  actorUserId: string;
  buildingId: string;
  rows: ValidatedRow[];
}): Promise<{
  created: number;
  skipped: number;
  ownersCreated: number;
  ownershipsCreated: number;
}> {
  const okRows = input.rows.filter((r) => r.ok && r.data);
  if (okRows.length === 0) {
    return { created: 0, skipped: input.rows.length, ownersCreated: 0, ownershipsCreated: 0 };
  }

  // Enforce quota up-front for the whole batch.
  await assertQuota(input.organizationId, "managedUnits", okRows.length);

  // Preload entrances to resolve entranceCode → id.
  const entrances = await prisma.buildingEntranceSection.findMany({
    where: { buildingId: input.buildingId },
    select: { id: true, code: true },
  });
  const entranceByCode = new Map(entrances.map((e) => [e.code, e.id]));
  // Preload existing units to skip duplicates (code is unique per building).
  const existing = await prisma.managedUnit.findMany({
    where: { buildingId: input.buildingId },
    select: { code: true },
  });
  const existingCodes = new Set(existing.map((e) => e.code));

  let created = 0;
  let skipped = 0;
  let ownersCreated = 0;
  let ownershipsCreated = 0;

  await prisma.$transaction(async (tx) => {
    for (const row of okRows) {
      const data = row.data!;
      if (existingCodes.has(data.code)) {
        skipped += 1;
        continue;
      }
      let entranceId: string | null = null;
      if (data.entranceCode) {
        entranceId = entranceByCode.get(data.entranceCode) ?? null;
        if (!entranceId) {
          // Auto-create new entrance so operator doesn't need to pre-seed.
          const ent = await tx.buildingEntranceSection.create({
            data: {
              buildingId: input.buildingId,
              code: data.entranceCode,
              sortOrder: entranceByCode.size,
            },
          });
          entranceId = ent.id;
          entranceByCode.set(data.entranceCode, ent.id);
        }
      }

      const unit = await tx.managedUnit.create({
        data: {
          organizationId: input.organizationId,
          buildingId: input.buildingId,
          entranceId,
          code: data.code,
          type: data.type,
          floor: data.floor ?? null,
          totalArea: data.totalArea,
          participationShare: data.participationShare ?? 1,
          roomCount: data.roomCount ?? null,
          notes: data.notes ?? null,
        },
      });
      created += 1;

      if (data.owner) {
        const person = await tx.buildingPerson.create({
          data: {
            organizationId: input.organizationId,
            buildingId: input.buildingId,
            firstName: data.owner.firstName ?? null,
            lastName: data.owner.lastName ?? null,
            legalName: data.owner.legalName ?? null,
            email: data.owner.email ?? null,
            phone: data.owner.phone ?? null,
            primaryRole: data.owner.role,
          },
        });
        ownersCreated += 1;

        await tx.unitOwnership.create({
          data: {
            unitId: unit.id,
            personId: person.id,
            role: data.owner.role,
            sharePercent: 100,
            isPrimary: true,
          },
        });
        ownershipsCreated += 1;
      }
    }
  });

  await recordAudit({
    action: "manager.import_batch",
    entityType: "ManagedBuilding",
    entityId: input.buildingId,
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    newValues: { created, skipped, ownersCreated, ownershipsCreated },
  });

  return { created, skipped, ownersCreated, ownershipsCreated };
}
