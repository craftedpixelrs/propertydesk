import "server-only";
import type { Prisma, UnitStatus, UnitType } from "@prisma/client";
import Decimal from "decimal.js";

import { prisma } from "@/server/db/prisma";
import { DomainErrors } from "@/lib/errors";
import { recordAudit } from "@/server/audit/audit";
import { assertQuota } from "@/server/services/quotas.service";

/**
 * Units service.
 *
 * Rules enforced here:
 *   - unique `(projectId, code)` per project (schema-level).
 *   - Any price change writes a `UnitPriceHistory` row inside a transaction.
 *   - Any status change goes through `changeUnitStatus`, which writes a
 *     `UnitStatusHistory` row and enforces the allowed transition graph.
 *   - Optimistic concurrency: mutations bump `version` and callers may pass
 *     an expected version.
 *   - Quota enforcement on create.
 *   - Audit on every mutation.
 */

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface ListUnitsInput {
  organizationId: string;
  page: number;
  pageSize: number;
  search?: string;
  projectId?: string;
  buildingId?: string;
  entranceId?: string;
  floorId?: string;
  status?: UnitStatus[];
  type?: UnitType[];
  priceMin?: number;
  priceMax?: number;
  areaMin?: number;
  areaMax?: number;
  bedroomsMin?: number;
  bedroomsMax?: number;
  activeOnly?: boolean;
  sort?: { field: string; direction: "asc" | "desc" };
}

export interface CreateUnitInput {
  organizationId: string;
  actorUserId: string;
  projectId: string;
  buildingId?: string | null;
  entranceId?: string | null;
  floorId?: string | null;
  code: string;
  type: UnitType;
  status?: UnitStatus;
  structure?: string;
  roomCount?: number;
  totalArea: number;
  internalArea?: number;
  terraceArea?: number;
  gardenArea?: number;
  orientation?: string;
  basePrice: number;
  finalPrice?: number;
  currency?: string;
  vatRate?: number;
  vatIncluded?: boolean;
  bedrooms?: number;
  bathrooms?: number;
  hasTerrace?: boolean;
  hasGarden?: boolean;
  publicDescription?: string;
  internalNotes?: string;
  isVisibleToAgencies?: boolean;
}

export interface UpdateUnitInput {
  organizationId: string;
  actorUserId: string;
  unitId: string;
  expectedVersion?: number;
  patch: Partial<
    Omit<CreateUnitInput, "organizationId" | "actorUserId" | "projectId" | "code">
  >;
  priceChangeReason?: string;
}

// -----------------------------------------------------------------------------
// Status transition matrix
// -----------------------------------------------------------------------------

// Allowed transitions. Everything else must be rejected with a Serbian
// message. Coupled tightly with reservation/sale flow (Phases 3 & 5).
const ALLOWED_STATUS_TRANSITIONS: Record<UnitStatus, UnitStatus[]> = {
  AVAILABLE: ["ON_HOLD", "RESERVED", "BLOCKED", "NOT_FOR_SALE"],
  ON_HOLD: ["AVAILABLE", "RESERVED", "BLOCKED", "NOT_FOR_SALE"],
  RESERVED: ["AVAILABLE", "DEPOSIT_PAID", "CONTRACTED", "BLOCKED"],
  DEPOSIT_PAID: ["CONTRACTED", "RESERVED", "AVAILABLE"],
  CONTRACTED: ["SOLD", "AVAILABLE"],
  SOLD: ["AVAILABLE"],
  BLOCKED: ["AVAILABLE", "NOT_FOR_SALE"],
  NOT_FOR_SALE: ["AVAILABLE"],
};

function toDecimalOrNull(value: number | undefined | null): Decimal | null {
  if (value == null) return null;
  return new Decimal(value);
}

function pricePerSquareMeter(
  price: Decimal | null,
  area: Decimal | null | undefined,
): Decimal | null {
  if (!price || !area || area.isZero()) return null;
  return price.div(area).toDecimalPlaces(2);
}

const ALLOWED_UNIT_SORT_FIELDS = new Set([
  "createdAt",
  "code",
  "status",
  "basePrice",
  "totalArea",
]);

function resolveUnitOrderBy(
  sort: ListUnitsInput["sort"],
): Prisma.UnitOrderByWithRelationInput {
  if (!sort || !ALLOWED_UNIT_SORT_FIELDS.has(sort.field)) {
    return { createdAt: "desc" };
  }
  return {
    [sort.field]: sort.direction,
  } as Prisma.UnitOrderByWithRelationInput;
}

// -----------------------------------------------------------------------------
// Public API
// -----------------------------------------------------------------------------

export async function listUnits(input: ListUnitsInput) {
  const where: Prisma.UnitWhereInput = {
    organizationId: input.organizationId,
    ...(input.projectId ? { projectId: input.projectId } : {}),
    ...(input.buildingId ? { buildingId: input.buildingId } : {}),
    ...(input.entranceId ? { entranceId: input.entranceId } : {}),
    ...(input.floorId ? { floorId: input.floorId } : {}),
    ...(input.status?.length ? { status: { in: input.status } } : {}),
    ...(input.type?.length ? { type: { in: input.type } } : {}),
    ...(input.activeOnly ? { archivedAt: null } : {}),
    ...(input.priceMin != null || input.priceMax != null
      ? {
          basePrice: {
            ...(input.priceMin != null ? { gte: input.priceMin } : {}),
            ...(input.priceMax != null ? { lte: input.priceMax } : {}),
          },
        }
      : {}),
    ...(input.areaMin != null || input.areaMax != null
      ? {
          totalArea: {
            ...(input.areaMin != null ? { gte: input.areaMin } : {}),
            ...(input.areaMax != null ? { lte: input.areaMax } : {}),
          },
        }
      : {}),
    ...(input.bedroomsMin != null || input.bedroomsMax != null
      ? {
          bedrooms: {
            ...(input.bedroomsMin != null ? { gte: input.bedroomsMin } : {}),
            ...(input.bedroomsMax != null ? { lte: input.bedroomsMax } : {}),
          },
        }
      : {}),
    ...(input.search
      ? {
          OR: [
            { code: { contains: input.search, mode: "insensitive" } },
            { externalReference: { contains: input.search, mode: "insensitive" } },
            { project: { name: { contains: input.search, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const [total, rows] = await Promise.all([
    prisma.unit.count({ where }),
    prisma.unit.findMany({
      where,
      orderBy: resolveUnitOrderBy(input.sort),
      skip: (input.page - 1) * input.pageSize,
      take: input.pageSize,
      include: {
        project: { select: { id: true, name: true, code: true } },
        building: { select: { id: true, name: true, code: true } },
        entrance: { select: { id: true, name: true, code: true } },
        floor: { select: { id: true, label: true } },
      },
    }),
  ]);
  return { items: rows, total };
}

export async function getUnitById(organizationId: string, unitId: string) {
  const unit = await prisma.unit.findFirst({
    where: { id: unitId, organizationId },
    include: {
      project: true,
      building: true,
      entrance: true,
      floor: true,
      priceHistory: {
        orderBy: { changedAt: "desc" },
        take: 30,
        include: {
          changedByUser: { select: { id: true, name: true, email: true } },
        },
      },
      statusHistory: {
        orderBy: { changedAt: "desc" },
        take: 30,
        include: {
          changedByUser: { select: { id: true, name: true, email: true } },
        },
      },
      reservations: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });
  if (!unit) throw DomainErrors.notFound("Jedinica");
  return unit;
}

export async function createUnit(input: CreateUnitInput) {
  await assertQuota(input.organizationId, "units");

  // Verify project + optional structural refs are owned by tenant.
  const project = await prisma.project.findFirst({
    where: { id: input.projectId, organizationId: input.organizationId },
    select: { id: true, archivedAt: true },
  });
  if (!project) throw DomainErrors.notFound("Projekat");
  if (project.archivedAt) {
    throw DomainErrors.invalidState("Ne možete dodavati jedinice u arhivirani projekat.");
  }

  const dup = await prisma.unit.findFirst({
    where: { projectId: input.projectId, code: input.code },
    select: { id: true },
  });
  if (dup) {
    throw DomainErrors.conflict(
      `Jedinica sa šifrom "${input.code}" već postoji u ovom projektu.`,
    );
  }

  const basePrice = new Decimal(input.basePrice);
  const finalPrice = toDecimalOrNull(input.finalPrice);
  const totalArea = new Decimal(input.totalArea);
  const ppsm = pricePerSquareMeter(finalPrice ?? basePrice, totalArea);

  const created = await prisma.unit.create({
    data: {
      organizationId: input.organizationId,
      projectId: input.projectId,
      buildingId: input.buildingId ?? null,
      entranceId: input.entranceId ?? null,
      floorId: input.floorId ?? null,
      code: input.code,
      type: input.type,
      status: input.status ?? "AVAILABLE",
      structure: input.structure ?? null,
      roomCount: input.roomCount ?? null,
      totalArea,
      internalArea: toDecimalOrNull(input.internalArea),
      terraceArea: toDecimalOrNull(input.terraceArea),
      gardenArea: toDecimalOrNull(input.gardenArea),
      orientation: input.orientation ?? null,
      basePrice,
      finalPrice,
      pricePerSquareMeter: ppsm,
      currency: input.currency ?? "EUR",
      vatRate: toDecimalOrNull(input.vatRate),
      vatIncluded: input.vatIncluded ?? false,
      bedrooms: input.bedrooms ?? null,
      bathrooms: input.bathrooms ?? null,
      hasTerrace: input.hasTerrace ?? false,
      hasGarden: input.hasGarden ?? false,
      publicDescription: input.publicDescription ?? null,
      internalNotes: input.internalNotes ?? null,
      isVisibleToAgencies: input.isVisibleToAgencies ?? false,
    },
  });

  await recordAudit({
    action: "unit.created",
    entityType: "Unit",
    entityId: created.id,
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    newValues: {
      code: created.code,
      projectId: created.projectId,
      type: created.type,
      basePrice: created.basePrice.toString(),
    },
  });

  return created;
}

export async function updateUnit(input: UpdateUnitInput) {
  const existing = await prisma.unit.findFirst({
    where: { id: input.unitId, organizationId: input.organizationId },
  });
  if (!existing) throw DomainErrors.notFound("Jedinica");

  if (
    input.expectedVersion != null &&
    existing.version !== input.expectedVersion
  ) {
    throw DomainErrors.optimisticLock();
  }

  const priceChanged =
    (input.patch.basePrice != null &&
      !new Decimal(input.patch.basePrice).eq(existing.basePrice)) ||
    (input.patch.finalPrice != null &&
      (existing.finalPrice == null ||
        !new Decimal(input.patch.finalPrice).eq(existing.finalPrice)));

  const newBase =
    input.patch.basePrice != null
      ? new Decimal(input.patch.basePrice)
      : (existing.basePrice as Decimal);
  const newFinal =
    input.patch.finalPrice !== undefined
      ? toDecimalOrNull(input.patch.finalPrice)
      : (existing.finalPrice as Decimal | null);
  const newTotalArea =
    input.patch.totalArea != null
      ? new Decimal(input.patch.totalArea)
      : (existing.totalArea as Decimal);

  const ppsm = pricePerSquareMeter(newFinal ?? newBase, newTotalArea);

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.unit.update({
      where: { id: input.unitId },
      data: {
        buildingId: input.patch.buildingId ?? undefined,
        entranceId: input.patch.entranceId ?? undefined,
        floorId: input.patch.floorId ?? undefined,
        type: input.patch.type ?? undefined,
        structure: input.patch.structure ?? undefined,
        roomCount: input.patch.roomCount ?? undefined,
        totalArea:
          input.patch.totalArea != null ? new Decimal(input.patch.totalArea) : undefined,
        internalArea:
          input.patch.internalArea != null
            ? new Decimal(input.patch.internalArea)
            : undefined,
        terraceArea:
          input.patch.terraceArea != null
            ? new Decimal(input.patch.terraceArea)
            : undefined,
        gardenArea:
          input.patch.gardenArea != null ? new Decimal(input.patch.gardenArea) : undefined,
        orientation: input.patch.orientation ?? undefined,
        basePrice:
          input.patch.basePrice != null ? new Decimal(input.patch.basePrice) : undefined,
        finalPrice:
          input.patch.finalPrice !== undefined
            ? toDecimalOrNull(input.patch.finalPrice)
            : undefined,
        pricePerSquareMeter: ppsm,
        currency: input.patch.currency ?? undefined,
        vatRate:
          input.patch.vatRate !== undefined ? toDecimalOrNull(input.patch.vatRate) : undefined,
        vatIncluded: input.patch.vatIncluded ?? undefined,
        bedrooms: input.patch.bedrooms ?? undefined,
        bathrooms: input.patch.bathrooms ?? undefined,
        hasTerrace: input.patch.hasTerrace ?? undefined,
        hasGarden: input.patch.hasGarden ?? undefined,
        publicDescription: input.patch.publicDescription ?? undefined,
        internalNotes: input.patch.internalNotes ?? undefined,
        isVisibleToAgencies: input.patch.isVisibleToAgencies ?? undefined,
        version: { increment: 1 },
      },
    });

    if (priceChanged) {
      await tx.unitPriceHistory.create({
        data: {
          organizationId: input.organizationId,
          unitId: input.unitId,
          previousBasePrice: existing.basePrice as Decimal,
          newBasePrice: newBase,
          previousFinalPrice: existing.finalPrice ?? null,
          newFinalPrice: newFinal ?? null,
          currency: existing.currency,
          reason: input.priceChangeReason ?? null,
          changedByUserId: input.actorUserId,
        },
      });
    }

    return updated;
  });

  await recordAudit({
    action: priceChanged ? "unit.price_changed" : "unit.updated",
    entityType: "Unit",
    entityId: result.id,
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    previousValues: priceChanged
      ? {
          basePrice: existing.basePrice.toString(),
          finalPrice: existing.finalPrice?.toString() ?? null,
        }
      : undefined,
    newValues: priceChanged
      ? {
          basePrice: newBase.toString(),
          finalPrice: newFinal?.toString() ?? null,
        }
      : { patchKeys: Object.keys(input.patch) },
  });

  return result;
}

/**
 * UnitStatusService — sole authorized path for changing `unit.status`.
 *
 * The reservation & sale services (Phases 3 & 5) call into this function
 * from inside their own transactions to keep everything consistent. All
 * transitions must be listed in `ALLOWED_STATUS_TRANSITIONS`, otherwise
 * an `INVALID_STATE` domain error is raised.
 */
export async function changeUnitStatus(input: {
  organizationId: string;
  actorUserId: string;
  unitId: string;
  newStatus: UnitStatus;
  reason?: string;
  tx?: Prisma.TransactionClient;
  allowOverride?: boolean; // skip transition check (super_admin/reopen_sold)
}) {
  const client = input.tx ?? prisma;
  const existing = await client.unit.findFirst({
    where: { id: input.unitId, organizationId: input.organizationId },
    select: { id: true, status: true, version: true },
  });
  if (!existing) throw DomainErrors.notFound("Jedinica");
  if (existing.status === input.newStatus) {
    return existing;
  }
  if (!input.allowOverride) {
    const allowed = ALLOWED_STATUS_TRANSITIONS[existing.status] ?? [];
    if (!allowed.includes(input.newStatus)) {
      throw DomainErrors.invalidState(
        `Prelaz iz statusa "${existing.status}" u "${input.newStatus}" nije dozvoljen.`,
      );
    }
  }

  const updated = await client.unit.update({
    where: { id: input.unitId },
    data: {
      status: input.newStatus,
      version: { increment: 1 },
    },
  });

  await client.unitStatusHistory.create({
    data: {
      organizationId: input.organizationId,
      unitId: input.unitId,
      previousStatus: existing.status,
      newStatus: input.newStatus,
      reason: input.reason ?? null,
      changedByUserId: input.actorUserId,
    },
  });

  // Only emit audit outside of any provided TX to keep it separate from the
  // caller's transactional boundary. If we're inside a tx, the caller is
  // responsible for whatever event they emit.
  if (!input.tx) {
    await recordAudit({
      action: "unit.status_changed",
      entityType: "Unit",
      entityId: input.unitId,
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      previousValues: { status: existing.status },
      newValues: { status: input.newStatus, reason: input.reason },
    });
  }

  return updated;
}

export async function archiveUnit(input: {
  organizationId: string;
  actorUserId: string;
  unitId: string;
}) {
  const existing = await prisma.unit.findFirst({
    where: { id: input.unitId, organizationId: input.organizationId },
    select: { id: true, archivedAt: true, status: true },
  });
  if (!existing) throw DomainErrors.notFound("Jedinica");
  if (existing.archivedAt) {
    throw DomainErrors.invalidState("Jedinica je već arhivirana.");
  }
  if (existing.status === "RESERVED" || existing.status === "CONTRACTED" || existing.status === "SOLD") {
    throw DomainErrors.invalidState(
      "Ne možete arhivirati jedinicu u aktivnom prodajnom procesu.",
    );
  }
  await prisma.unit.update({
    where: { id: input.unitId },
    data: { archivedAt: new Date() },
  });
  await recordAudit({
    action: "unit.archived",
    entityType: "Unit",
    entityId: input.unitId,
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
  });
}

export async function restoreUnit(input: {
  organizationId: string;
  actorUserId: string;
  unitId: string;
}) {
  const existing = await prisma.unit.findFirst({
    where: { id: input.unitId, organizationId: input.organizationId },
    select: { id: true, archivedAt: true },
  });
  if (!existing) throw DomainErrors.notFound("Jedinica");
  if (!existing.archivedAt) {
    throw DomainErrors.invalidState("Jedinica nije arhivirana.");
  }
  await prisma.unit.update({
    where: { id: input.unitId },
    data: { archivedAt: null },
  });
  await recordAudit({
    action: "unit.restored",
    entityType: "Unit",
    entityId: input.unitId,
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
  });
}

export const ALLOWED_UNIT_STATUS_TRANSITIONS = ALLOWED_STATUS_TRANSITIONS;
