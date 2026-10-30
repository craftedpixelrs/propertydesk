import "server-only";
import type { ManagedUnitType, Prisma } from "@prisma/client";

import { prisma } from "@/server/db/prisma";
import { DomainErrors } from "@/lib/errors";
import { recordAudit } from "@/server/audit/audit";
import { assertQuota } from "@/server/services/quotas.service";

/**
 * Faza 11 — Managed buildings service.
 *
 * Scope: CRUD for `ManagedBuilding`, `BuildingEntranceSection`, `ManagedUnit`,
 * `BuildingPerson` + `UnitOwnership`.
 *
 * Mirrors the investor projects/units pattern:
 *   - every mutation runs inside a transaction + `recordAudit`
 *   - every read is `organizationId`-scoped
 *   - quota is checked via `assertQuota(... , "managedBuildings"|"managedUnits")`
 */

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface ListBuildingsInput {
  organizationId: string;
  page: number;
  pageSize: number;
  search?: string;
  city?: string;
  includeArchived?: boolean;
  sort?: { field: "createdAt" | "name" | "city"; direction: "asc" | "desc" };
}

export interface BuildingListItem {
  id: string;
  name: string;
  address: string;
  city: string;
  entranceCount: number;
  unitCount: number;
  outstandingDebt: string | null;
  archivedAt: Date | null;
  createdAt: Date;
}

export interface CreateBuildingInput {
  organizationId: string;
  actorUserId: string;
  name: string;
  address: string;
  city: string;
  municipality?: string | null;
  postalCode?: string | null;
  country?: string | null;
  legalName?: string | null;
  registrationNumber?: string | null;
  taxNumber?: string | null;
  paymentAccountNumber?: string | null;
  paymentBankName?: string | null;
  cadastralLot?: string | null;
  cadastralMunicipality?: string | null;
  entranceCount?: number;
  storeyCount?: number | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  notes?: string | null;
}

export interface UpdateBuildingInput {
  organizationId: string;
  actorUserId: string;
  buildingId: string;
  patch: Partial<Omit<CreateBuildingInput, "organizationId" | "actorUserId">>;
}

// -----------------------------------------------------------------------------
// Validation helpers
// -----------------------------------------------------------------------------

function sanitize(input: Partial<CreateBuildingInput>) {
  const trim = (v: string | null | undefined) => (v == null ? v : v.trim());
  const data: Prisma.ManagedBuildingUpdateInput = {};
  if (input.name !== undefined) data.name = String(input.name).trim();
  if (input.address !== undefined) data.address = String(input.address).trim();
  if (input.city !== undefined) data.city = String(input.city).trim();
  if (input.municipality !== undefined) data.municipality = trim(input.municipality);
  if (input.postalCode !== undefined) data.postalCode = trim(input.postalCode);
  if (input.country !== undefined) data.country = trim(input.country) ?? "RS";
  if (input.legalName !== undefined) data.legalName = trim(input.legalName);
  if (input.registrationNumber !== undefined)
    data.registrationNumber = trim(input.registrationNumber);
  if (input.taxNumber !== undefined) data.taxNumber = trim(input.taxNumber);
  if (input.paymentAccountNumber !== undefined)
    data.paymentAccountNumber = trim(input.paymentAccountNumber);
  if (input.paymentBankName !== undefined) data.paymentBankName = trim(input.paymentBankName);
  if (input.cadastralLot !== undefined) data.cadastralLot = trim(input.cadastralLot);
  if (input.cadastralMunicipality !== undefined)
    data.cadastralMunicipality = trim(input.cadastralMunicipality);
  if (input.entranceCount !== undefined) data.entranceCount = Math.max(1, input.entranceCount);
  if (input.storeyCount !== undefined) data.storeyCount = input.storeyCount;
  if (input.contactEmail !== undefined) data.contactEmail = trim(input.contactEmail);
  if (input.contactPhone !== undefined) data.contactPhone = trim(input.contactPhone);
  if (input.notes !== undefined) data.notes = trim(input.notes);
  return data;
}

// -----------------------------------------------------------------------------
// Buildings
// -----------------------------------------------------------------------------

export async function listManagedBuildings(input: ListBuildingsInput): Promise<{
  items: BuildingListItem[];
  total: number;
}> {
  const page = Math.max(1, input.page);
  const pageSize = Math.min(200, Math.max(1, input.pageSize));
  const where: Prisma.ManagedBuildingWhereInput = {
    organizationId: input.organizationId,
    ...(input.includeArchived ? {} : { archivedAt: null }),
    ...(input.city ? { city: input.city } : {}),
    ...(input.search
      ? {
          OR: [
            { name: { contains: input.search, mode: "insensitive" } },
            { address: { contains: input.search, mode: "insensitive" } },
            { taxNumber: { contains: input.search } },
          ],
        }
      : {}),
  };

  const sortField = input.sort?.field ?? "createdAt";
  const sortDirection = input.sort?.direction ?? "desc";

  const [rows, total] = await Promise.all([
    prisma.managedBuilding.findMany({
      where,
      orderBy: { [sortField]: sortDirection } as Prisma.ManagedBuildingOrderByWithRelationInput,
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        name: true,
        address: true,
        city: true,
        entranceCount: true,
        archivedAt: true,
        createdAt: true,
        _count: { select: { units: true } },
      },
    }),
    prisma.managedBuilding.count({ where }),
  ]);

  // Collect outstanding debt per building in a single query.
  const buildingIds = rows.map((r) => r.id);
  const debtAgg = buildingIds.length
    ? await prisma.duesCharge.groupBy({
        by: ["buildingId"],
        where: {
          organizationId: input.organizationId,
          buildingId: { in: buildingIds },
          status: { in: ["OPEN", "PARTIALLY_PAID"] },
        },
        _sum: { totalAmount: true, paidAmount: true },
      })
    : [];
  const debtMap = new Map(
    debtAgg.map((row) => {
      const total = row._sum.totalAmount ?? 0;
      const paid = row._sum.paidAmount ?? 0;
      return [row.buildingId, Number(total) - Number(paid)];
    }),
  );

  return {
    items: rows.map((r) => ({
      id: r.id,
      name: r.name,
      address: r.address,
      city: r.city,
      entranceCount: r.entranceCount,
      unitCount: r._count.units,
      outstandingDebt: debtMap.has(r.id) ? debtMap.get(r.id)!.toFixed(2) : null,
      archivedAt: r.archivedAt,
      createdAt: r.createdAt,
    })),
    total,
  };
}

export async function getManagedBuilding(organizationId: string, buildingId: string) {
  const row = await prisma.managedBuilding.findFirst({
    where: { id: buildingId, organizationId },
    include: {
      entrances: { orderBy: [{ sortOrder: "asc" }, { code: "asc" }] },
      _count: { select: { units: true, persons: true, tickets: true, assemblies: true } },
    },
  });
  if (!row) throw DomainErrors.notFound("Zgrada");
  return row;
}

export async function createManagedBuilding(input: CreateBuildingInput) {
  if (!input.name?.trim()) throw DomainErrors.validation("Naziv zgrade je obavezan.");
  if (!input.address?.trim()) throw DomainErrors.validation("Adresa je obavezna.");
  if (!input.city?.trim()) throw DomainErrors.validation("Grad je obavezan.");

  await assertQuota(input.organizationId, "managedBuildings", 1);

  const data = sanitize(input);
  const created = await prisma.$transaction(async (tx) => {
    const row = await tx.managedBuilding.create({
      data: {
        ...(data as Prisma.ManagedBuildingUpdateInput),
        name: String(data.name ?? input.name),
        address: String(data.address ?? input.address),
        city: String(data.city ?? input.city),
        entranceCount: Number(data.entranceCount ?? input.entranceCount ?? 1),
        organization: { connect: { id: input.organizationId } },
      } as Prisma.ManagedBuildingCreateInput,
    });

    // Default entrance "A" if entranceCount >= 1 (keeps "unit must have
    // entrance" paths safe without forcing the UI to seed one).
    await tx.buildingEntranceSection.create({
      data: {
        buildingId: row.id,
        code: "A",
        label: null,
        sortOrder: 0,
      },
    });

    return row;
  });

  await recordAudit({
    action: "manager.building_created",
    entityType: "ManagedBuilding",
    entityId: created.id,
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    newValues: { name: created.name, city: created.city },
  });

  return created;
}

export async function updateManagedBuilding(input: UpdateBuildingInput) {
  const existing = await prisma.managedBuilding.findFirst({
    where: { id: input.buildingId, organizationId: input.organizationId },
  });
  if (!existing) throw DomainErrors.notFound("Zgrada");

  const data = sanitize(input.patch);
  const updated = await prisma.managedBuilding.update({
    where: { id: input.buildingId },
    data,
  });

  await recordAudit({
    action: "manager.building_updated",
    entityType: "ManagedBuilding",
    entityId: updated.id,
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    previousValues: existing,
    newValues: updated,
  });

  return updated;
}

export async function archiveManagedBuilding(input: {
  organizationId: string;
  actorUserId: string;
  buildingId: string;
  reason?: string | null;
}) {
  const existing = await prisma.managedBuilding.findFirst({
    where: { id: input.buildingId, organizationId: input.organizationId },
  });
  if (!existing) throw DomainErrors.notFound("Zgrada");
  if (existing.archivedAt) return existing;

  const updated = await prisma.managedBuilding.update({
    where: { id: input.buildingId },
    data: { archivedAt: new Date() },
  });
  await recordAudit({
    action: "manager.building_archived",
    entityType: "ManagedBuilding",
    entityId: updated.id,
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    metadata: input.reason ? { reason: input.reason } : undefined,
  });
  return updated;
}

export async function restoreManagedBuilding(input: {
  organizationId: string;
  actorUserId: string;
  buildingId: string;
}) {
  const existing = await prisma.managedBuilding.findFirst({
    where: { id: input.buildingId, organizationId: input.organizationId },
  });
  if (!existing) throw DomainErrors.notFound("Zgrada");
  if (!existing.archivedAt) return existing;

  const updated = await prisma.managedBuilding.update({
    where: { id: input.buildingId },
    data: { archivedAt: null },
  });
  await recordAudit({
    action: "manager.building_restored",
    entityType: "ManagedBuilding",
    entityId: updated.id,
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
  });
  return updated;
}

// -----------------------------------------------------------------------------
// Entrances
// -----------------------------------------------------------------------------

export async function listEntrances(organizationId: string, buildingId: string) {
  await assertBuildingBelongsToOrg(organizationId, buildingId);
  return prisma.buildingEntranceSection.findMany({
    where: { buildingId },
    orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
  });
}

export async function upsertEntrance(input: {
  organizationId: string;
  actorUserId: string;
  buildingId: string;
  code: string;
  label?: string | null;
  sortOrder?: number;
}) {
  await assertBuildingBelongsToOrg(input.organizationId, input.buildingId);
  const code = input.code.trim();
  if (!code) throw DomainErrors.validation("Šifra ulaza je obavezna.");

  const existing = await prisma.buildingEntranceSection.findUnique({
    where: { buildingId_code: { buildingId: input.buildingId, code } },
  });

  const row = existing
    ? await prisma.buildingEntranceSection.update({
        where: { id: existing.id },
        data: {
          label: input.label === undefined ? existing.label : input.label?.trim() || null,
          sortOrder: input.sortOrder ?? existing.sortOrder,
        },
      })
    : await prisma.buildingEntranceSection.create({
        data: {
          buildingId: input.buildingId,
          code,
          label: input.label?.trim() || null,
          sortOrder: input.sortOrder ?? 0,
        },
      });

  await recordAudit({
    action: existing ? "manager.entrance_updated" : "manager.entrance_created",
    entityType: "BuildingEntranceSection",
    entityId: row.id,
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    newValues: { code: row.code, label: row.label },
  });
  return row;
}

// -----------------------------------------------------------------------------
// Units (ManagedUnit)
// -----------------------------------------------------------------------------

export interface CreateManagedUnitInput {
  organizationId: string;
  actorUserId: string;
  buildingId: string;
  entranceId?: string | null;
  code: string;
  type?: ManagedUnitType;
  floor?: number | null;
  totalArea: number;
  participationShare?: number;
  roomCount?: number | null;
  notes?: string | null;
}

export interface UpdateManagedUnitInput {
  organizationId: string;
  actorUserId: string;
  unitId: string;
  patch: Partial<Omit<CreateManagedUnitInput, "organizationId" | "actorUserId" | "buildingId">>;
}

export async function listManagedUnits(input: {
  organizationId: string;
  buildingId: string;
  includeArchived?: boolean;
}) {
  await assertBuildingBelongsToOrg(input.organizationId, input.buildingId);
  return prisma.managedUnit.findMany({
    where: {
      organizationId: input.organizationId,
      buildingId: input.buildingId,
      ...(input.includeArchived ? {} : { archivedAt: null }),
    },
    include: {
      entrance: { select: { id: true, code: true } },
      ownerships: {
        where: { endedAt: null },
        include: {
          person: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              legalName: true,
              email: true,
              phone: true,
            },
          },
        },
      },
    },
    orderBy: [{ entranceId: "asc" }, { code: "asc" }],
  });
}

export async function createManagedUnit(input: CreateManagedUnitInput) {
  await assertBuildingBelongsToOrg(input.organizationId, input.buildingId);
  const code = input.code.trim();
  if (!code) throw DomainErrors.validation("Šifra posebnog dela je obavezna.");
  if (!(input.totalArea > 0)) {
    throw DomainErrors.validation("Površina mora biti veća od 0.");
  }
  await assertQuota(input.organizationId, "managedUnits", 1);

  if (input.entranceId) {
    const entrance = await prisma.buildingEntranceSection.findFirst({
      where: { id: input.entranceId, buildingId: input.buildingId },
    });
    if (!entrance) throw DomainErrors.notFound("Ulaz");
  }

  const row = await prisma.managedUnit.create({
    data: {
      organization: { connect: { id: input.organizationId } },
      building: { connect: { id: input.buildingId } },
      entrance: input.entranceId ? { connect: { id: input.entranceId } } : undefined,
      code,
      type: input.type ?? "APARTMENT",
      floor: input.floor ?? null,
      totalArea: input.totalArea,
      participationShare: input.participationShare ?? 1,
      roomCount: input.roomCount ?? null,
      notes: input.notes?.trim() || null,
    },
  });
  await recordAudit({
    action: "manager.unit_created",
    entityType: "ManagedUnit",
    entityId: row.id,
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    newValues: { code: row.code, type: row.type, totalArea: row.totalArea },
  });
  return row;
}

export async function updateManagedUnit(input: UpdateManagedUnitInput) {
  const existing = await prisma.managedUnit.findFirst({
    where: { id: input.unitId, organizationId: input.organizationId },
  });
  if (!existing) throw DomainErrors.notFound("Posebni deo");

  const data: Prisma.ManagedUnitUpdateInput = {};
  if (input.patch.code !== undefined) {
    const code = input.patch.code.trim();
    if (!code) throw DomainErrors.validation("Šifra je obavezna.");
    data.code = code;
  }
  if (input.patch.type !== undefined) data.type = input.patch.type;
  if (input.patch.floor !== undefined) data.floor = input.patch.floor;
  if (input.patch.totalArea !== undefined) {
    if (!(input.patch.totalArea > 0)) {
      throw DomainErrors.validation("Površina mora biti veća od 0.");
    }
    data.totalArea = input.patch.totalArea;
  }
  if (input.patch.participationShare !== undefined) {
    data.participationShare = input.patch.participationShare;
  }
  if (input.patch.roomCount !== undefined) data.roomCount = input.patch.roomCount;
  if (input.patch.notes !== undefined) data.notes = input.patch.notes?.trim() || null;
  if (input.patch.entranceId !== undefined) {
    if (input.patch.entranceId) {
      const entrance = await prisma.buildingEntranceSection.findFirst({
        where: { id: input.patch.entranceId, buildingId: existing.buildingId },
      });
      if (!entrance) throw DomainErrors.notFound("Ulaz");
      data.entrance = { connect: { id: input.patch.entranceId } };
    } else {
      data.entrance = { disconnect: true };
    }
  }

  const updated = await prisma.managedUnit.update({ where: { id: input.unitId }, data });
  await recordAudit({
    action: "manager.unit_updated",
    entityType: "ManagedUnit",
    entityId: updated.id,
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    previousValues: existing,
    newValues: updated,
  });
  return updated;
}

export async function archiveManagedUnit(input: {
  organizationId: string;
  actorUserId: string;
  unitId: string;
}) {
  const existing = await prisma.managedUnit.findFirst({
    where: { id: input.unitId, organizationId: input.organizationId },
  });
  if (!existing) throw DomainErrors.notFound("Posebni deo");
  if (existing.archivedAt) return existing;

  const updated = await prisma.managedUnit.update({
    where: { id: input.unitId },
    data: { archivedAt: new Date() },
  });
  await recordAudit({
    action: "manager.unit_archived",
    entityType: "ManagedUnit",
    entityId: updated.id,
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
  });
  return updated;
}

// -----------------------------------------------------------------------------
// People + ownerships
// -----------------------------------------------------------------------------

export interface CreateBuildingPersonInput {
  organizationId: string;
  actorUserId: string;
  buildingId: string;
  firstName?: string | null;
  lastName?: string | null;
  legalName?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  primaryRole?: "OWNER" | "TENANT" | "USER";
  notes?: string | null;
}

export async function createBuildingPerson(input: CreateBuildingPersonInput) {
  await assertBuildingBelongsToOrg(input.organizationId, input.buildingId);
  const trim = (v: string | null | undefined) => v?.trim() || null;
  const row = await prisma.buildingPerson.create({
    data: {
      organizationId: input.organizationId,
      buildingId: input.buildingId,
      firstName: trim(input.firstName),
      lastName: trim(input.lastName),
      legalName: trim(input.legalName),
      email: trim(input.email),
      phone: trim(input.phone),
      address: trim(input.address),
      primaryRole: input.primaryRole ?? "OWNER",
      notes: trim(input.notes),
    },
  });
  await recordAudit({
    action: "manager.person_created",
    entityType: "BuildingPerson",
    entityId: row.id,
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    newValues: {
      name: row.legalName || `${row.firstName ?? ""} ${row.lastName ?? ""}`.trim(),
      role: row.primaryRole,
    },
  });
  return row;
}

export async function listBuildingPersons(organizationId: string, buildingId: string) {
  await assertBuildingBelongsToOrg(organizationId, buildingId);
  return prisma.buildingPerson.findMany({
    where: { organizationId, buildingId, archivedAt: null },
    include: {
      ownerships: {
        where: { endedAt: null },
        include: { unit: { select: { id: true, code: true } } },
      },
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }, { legalName: "asc" }],
  });
}

export async function assignOwnership(input: {
  organizationId: string;
  actorUserId: string;
  unitId: string;
  personId: string;
  role?: "OWNER" | "TENANT" | "USER";
  sharePercent?: number;
  isPrimary?: boolean;
  startedAt?: Date;
}) {
  const [unit, person] = await Promise.all([
    prisma.managedUnit.findFirst({
      where: { id: input.unitId, organizationId: input.organizationId },
    }),
    prisma.buildingPerson.findFirst({
      where: { id: input.personId, organizationId: input.organizationId },
    }),
  ]);
  if (!unit) throw DomainErrors.notFound("Posebni deo");
  if (!person) throw DomainErrors.notFound("Vlasnik");
  if (unit.buildingId !== person.buildingId) {
    throw DomainErrors.badRequest("Vlasnik i posebni deo moraju biti u istoj zgradi.");
  }

  const existing = await prisma.unitOwnership.findFirst({
    where: { unitId: input.unitId, personId: input.personId, endedAt: null },
  });
  if (existing) return existing;

  // If this is marked primary, demote other primary rows on the same unit.
  if (input.isPrimary !== false) {
    await prisma.unitOwnership.updateMany({
      where: { unitId: input.unitId, endedAt: null, isPrimary: true },
      data: { isPrimary: false },
    });
  }

  const row = await prisma.unitOwnership.create({
    data: {
      unitId: input.unitId,
      personId: input.personId,
      role: input.role ?? "OWNER",
      sharePercent: input.sharePercent ?? 100,
      isPrimary: input.isPrimary ?? true,
      startedAt: input.startedAt ?? new Date(),
    },
  });
  await recordAudit({
    action: "manager.ownership_assigned",
    entityType: "UnitOwnership",
    entityId: row.id,
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    newValues: { unitId: row.unitId, personId: row.personId, role: row.role },
  });
  return row;
}

export async function endOwnership(input: {
  organizationId: string;
  actorUserId: string;
  ownershipId: string;
  endedAt?: Date;
}) {
  const existing = await prisma.unitOwnership.findFirst({
    where: {
      id: input.ownershipId,
      person: { organizationId: input.organizationId },
    },
  });
  if (!existing) throw DomainErrors.notFound("Veza vlasnik-deo");
  if (existing.endedAt) return existing;
  const updated = await prisma.unitOwnership.update({
    where: { id: input.ownershipId },
    data: { endedAt: input.endedAt ?? new Date() },
  });
  await recordAudit({
    action: "manager.ownership_ended",
    entityType: "UnitOwnership",
    entityId: updated.id,
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
  });
  return updated;
}

// -----------------------------------------------------------------------------
// Internal helpers
// -----------------------------------------------------------------------------

export async function assertBuildingBelongsToOrg(organizationId: string, buildingId: string) {
  const exists = await prisma.managedBuilding.count({
    where: { id: buildingId, organizationId },
  });
  if (!exists) throw DomainErrors.notFound("Zgrada");
}
