import "server-only";
import type { UnitStatus } from "@prisma/client";

import { prisma } from "@/server/db/prisma";
import { DomainErrors } from "@/lib/errors";

/**
 * Interactive floor-plan service.
 *
 * The viewer (11a) reads floor plan areas plus the current status of
 * each anchored unit and paints them on top of the raster plan. This
 * module only supports read for now; the polygon editor (11b) is
 * planned after the 2026-09-01 launch and will add the mutate surface.
 */

export interface FloorPlanPoint {
  x: number; // 0..1
  y: number; // 0..1
}

export interface FloorPlanAreaView {
  id: string;
  unitId: string;
  unitCode: string;
  unitStatus: UnitStatus;
  polygon: FloorPlanPoint[];
}

export interface FloorPlanView {
  floorId: string;
  floorLabel: string;
  floorPlanUrl: string | null;
  areas: FloorPlanAreaView[];
}

function normalizePolygon(raw: unknown): FloorPlanPoint[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((p) => {
      if (!p || typeof p !== "object") return null;
      const point = p as { x?: unknown; y?: unknown };
      if (typeof point.x !== "number" || typeof point.y !== "number") return null;
      const x = Math.min(1, Math.max(0, point.x));
      const y = Math.min(1, Math.max(0, point.y));
      return { x, y };
    })
    .filter((p): p is FloorPlanPoint => p !== null);
}

export async function loadFloorPlan(input: {
  organizationId: string;
  floorId: string;
}): Promise<FloorPlanView> {
  const floor = await prisma.floor.findFirst({
    where: {
      id: input.floorId,
      entrance: {
        building: { project: { organizationId: input.organizationId } },
      },
    },
    select: {
      id: true,
      label: true,
      floorPlanUrl: true,
    },
  });
  if (!floor) throw DomainErrors.notFound("Sprat");

  const areas = await prisma.floorPlanArea.findMany({
    where: { organizationId: input.organizationId, floorId: input.floorId },
    select: {
      id: true,
      polygon: true,
      unit: { select: { id: true, code: true, status: true } },
    },
  });

  return {
    floorId: floor.id,
    floorLabel: floor.label,
    floorPlanUrl: floor.floorPlanUrl,
    areas: areas.map((a) => ({
      id: a.id,
      unitId: a.unit.id,
      unitCode: a.unit.code,
      unitStatus: a.unit.status,
      polygon: normalizePolygon(a.polygon as unknown),
    })),
  };
}
