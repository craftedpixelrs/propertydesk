import "server-only";

import { prisma } from "@/server/db/prisma";
import { DomainErrors } from "@/lib/errors";
import { recordAudit } from "@/server/audit/audit";

/**
 * Structural inventory service — buildings, entrances, floors.
 *
 * These are all lightweight tree nodes under a project. Every operation
 * verifies tenant scope by requiring an `organizationId` that matches the
 * project's owner and emits an audit event.
 */

async function assertProjectOwned(
  organizationId: string,
  projectId: string,
): Promise<void> {
  const project = await prisma.project.findFirst({
    where: { id: projectId, organizationId },
    select: { id: true },
  });
  if (!project) throw DomainErrors.notFound("Projekat");
}

async function assertBuildingOwned(
  organizationId: string,
  buildingId: string,
): Promise<string> {
  const building = await prisma.building.findFirst({
    where: { id: buildingId, project: { organizationId } },
    select: { id: true, projectId: true },
  });
  if (!building) throw DomainErrors.notFound("Objekat");
  return building.projectId;
}

async function assertEntranceOwned(
  organizationId: string,
  entranceId: string,
): Promise<{ buildingId: string; projectId: string }> {
  const entrance = await prisma.entrance.findFirst({
    where: { id: entranceId, building: { project: { organizationId } } },
    select: { id: true, buildingId: true, building: { select: { projectId: true } } },
  });
  if (!entrance) throw DomainErrors.notFound("Ulaz");
  return {
    buildingId: entrance.buildingId,
    projectId: entrance.building.projectId,
  };
}

// -----------------------------------------------------------------------------
// Buildings
// -----------------------------------------------------------------------------

export async function createBuilding(input: {
  organizationId: string;
  actorUserId: string;
  projectId: string;
  code: string;
  name: string;
  description?: string;
  sortOrder?: number;
}) {
  await assertProjectOwned(input.organizationId, input.projectId);
  const dup = await prisma.building.findFirst({
    where: { projectId: input.projectId, code: input.code },
    select: { id: true },
  });
  if (dup) {
    throw DomainErrors.conflict(
      `Objekat sa šifrom "${input.code}" već postoji u ovom projektu.`,
    );
  }
  const created = await prisma.building.create({
    data: {
      projectId: input.projectId,
      code: input.code,
      name: input.name,
      description: input.description ?? null,
      sortOrder: input.sortOrder ?? 0,
    },
  });
  await recordAudit({
    action: "building.created",
    entityType: "Building",
    entityId: created.id,
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    newValues: { code: created.code, name: created.name, projectId: created.projectId },
  });
  return created;
}

export async function updateBuilding(input: {
  organizationId: string;
  actorUserId: string;
  buildingId: string;
  patch: { name?: string; description?: string; sortOrder?: number };
}) {
  await assertBuildingOwned(input.organizationId, input.buildingId);
  const updated = await prisma.building.update({
    where: { id: input.buildingId },
    data: input.patch,
  });
  await recordAudit({
    action: "building.updated",
    entityType: "Building",
    entityId: updated.id,
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    newValues: input.patch,
  });
  return updated;
}

export async function deleteBuilding(input: {
  organizationId: string;
  actorUserId: string;
  buildingId: string;
}) {
  await assertBuildingOwned(input.organizationId, input.buildingId);
  const unitCount = await prisma.unit.count({
    where: { buildingId: input.buildingId },
  });
  if (unitCount > 0) {
    throw DomainErrors.invalidState(
      "Ovaj objekat sadrži jedinice i ne može biti obrisan. Premestite ili obrišite jedinice prvo.",
    );
  }
  await prisma.building.delete({ where: { id: input.buildingId } });
  await recordAudit({
    action: "building.deleted",
    entityType: "Building",
    entityId: input.buildingId,
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
  });
}

// -----------------------------------------------------------------------------
// Entrances
// -----------------------------------------------------------------------------

export async function createEntrance(input: {
  organizationId: string;
  actorUserId: string;
  buildingId: string;
  code: string;
  name: string;
  sortOrder?: number;
}) {
  await assertBuildingOwned(input.organizationId, input.buildingId);
  const dup = await prisma.entrance.findFirst({
    where: { buildingId: input.buildingId, code: input.code },
    select: { id: true },
  });
  if (dup) {
    throw DomainErrors.conflict(
      `Ulaz sa šifrom "${input.code}" već postoji u ovom objektu.`,
    );
  }
  const created = await prisma.entrance.create({
    data: {
      buildingId: input.buildingId,
      code: input.code,
      name: input.name,
      sortOrder: input.sortOrder ?? 0,
    },
  });
  await recordAudit({
    action: "entrance.created",
    entityType: "Entrance",
    entityId: created.id,
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    newValues: { code: created.code, name: created.name, buildingId: created.buildingId },
  });
  return created;
}

export async function updateEntrance(input: {
  organizationId: string;
  actorUserId: string;
  entranceId: string;
  patch: { name?: string; sortOrder?: number };
}) {
  await assertEntranceOwned(input.organizationId, input.entranceId);
  const updated = await prisma.entrance.update({
    where: { id: input.entranceId },
    data: input.patch,
  });
  await recordAudit({
    action: "entrance.updated",
    entityType: "Entrance",
    entityId: updated.id,
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    newValues: input.patch,
  });
  return updated;
}

export async function deleteEntrance(input: {
  organizationId: string;
  actorUserId: string;
  entranceId: string;
}) {
  await assertEntranceOwned(input.organizationId, input.entranceId);
  const unitCount = await prisma.unit.count({
    where: { entranceId: input.entranceId },
  });
  if (unitCount > 0) {
    throw DomainErrors.invalidState(
      "Ovaj ulaz sadrži jedinice i ne može biti obrisan.",
    );
  }
  await prisma.entrance.delete({ where: { id: input.entranceId } });
  await recordAudit({
    action: "entrance.deleted",
    entityType: "Entrance",
    entityId: input.entranceId,
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
  });
}

// -----------------------------------------------------------------------------
// Floors
// -----------------------------------------------------------------------------

export async function createFloor(input: {
  organizationId: string;
  actorUserId: string;
  entranceId: string;
  label: string;
  number?: number;
  sortOrder?: number;
  floorPlanUrl?: string;
}) {
  await assertEntranceOwned(input.organizationId, input.entranceId);
  const dup = await prisma.floor.findFirst({
    where: { entranceId: input.entranceId, label: input.label },
    select: { id: true },
  });
  if (dup) {
    throw DomainErrors.conflict(
      `Sprat "${input.label}" već postoji u ovom ulazu.`,
    );
  }
  const created = await prisma.floor.create({
    data: {
      entranceId: input.entranceId,
      label: input.label,
      number: input.number ?? null,
      sortOrder: input.sortOrder ?? 0,
      floorPlanUrl: input.floorPlanUrl ?? null,
    },
  });
  await recordAudit({
    action: "floor.created",
    entityType: "Floor",
    entityId: created.id,
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    newValues: { label: created.label, entranceId: created.entranceId },
  });
  return created;
}

export async function updateFloor(input: {
  organizationId: string;
  actorUserId: string;
  floorId: string;
  patch: { label?: string; number?: number | null; sortOrder?: number; floorPlanUrl?: string | null };
}) {
  const floor = await prisma.floor.findFirst({
    where: { id: input.floorId, entrance: { building: { project: { organizationId: input.organizationId } } } },
    select: { id: true },
  });
  if (!floor) throw DomainErrors.notFound("Sprat");
  const updated = await prisma.floor.update({
    where: { id: input.floorId },
    data: input.patch,
  });
  await recordAudit({
    action: "floor.updated",
    entityType: "Floor",
    entityId: updated.id,
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    newValues: input.patch,
  });
  return updated;
}

export async function deleteFloor(input: {
  organizationId: string;
  actorUserId: string;
  floorId: string;
}) {
  const floor = await prisma.floor.findFirst({
    where: { id: input.floorId, entrance: { building: { project: { organizationId: input.organizationId } } } },
    select: { id: true },
  });
  if (!floor) throw DomainErrors.notFound("Sprat");
  const unitCount = await prisma.unit.count({
    where: { floorId: input.floorId },
  });
  if (unitCount > 0) {
    throw DomainErrors.invalidState(
      "Ovaj sprat sadrži jedinice i ne može biti obrisan.",
    );
  }
  await prisma.floor.delete({ where: { id: input.floorId } });
  await recordAudit({
    action: "floor.deleted",
    entityType: "Floor",
    entityId: input.floorId,
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
  });
}
