import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { requirePermission } from "@/server/permissions/require";
import { createManagedUnit, listManagedUnits } from "@/server/services/manager/buildings.service";

const paramsSchema = z.object({ id: z.string().min(1) });

const createSchema = z.object({
  code: z.string().trim().min(1).max(40),
  entranceId: z.string().min(1).optional(),
  type: z
    .enum(["APARTMENT", "COMMERCIAL", "GARAGE", "PARKING_SPACE", "STORAGE", "OFFICE", "OTHER"])
    .optional(),
  floor: z.number().int().min(-5).max(100).nullable().optional(),
  totalArea: z.number().positive().max(10000),
  participationShare: z.number().min(0).max(10000).optional(),
  roomCount: z.number().min(0).max(99).nullable().optional(),
  notes: z.string().max(1000).optional(),
});

export const GET = apiHandler({ paramsSchema }, async ({ params, searchParams }) => {
  const ctx = await requirePermission("building.read");
  const includeArchived = searchParams.get("archived") === "true";
  const rows = await listManagedUnits({
    organizationId: ctx.organization.organizationId,
    buildingId: params.id,
    includeArchived,
  });
  return { data: rows };
});

export const POST = apiHandler(
  { paramsSchema, bodySchema: createSchema },
  async ({ params, body }) => {
    const ctx = await requirePermission("building.manage");
    const row = await createManagedUnit({
      organizationId: ctx.organization.organizationId,
      actorUserId: ctx.session.user.id,
      buildingId: params.id,
      ...body,
    });
    return { data: row, status: 201 };
  },
);

/**
 * @swagger
 * /api/v1/manager/buildings/{id}/units:
 *   get:
 *     tags: [manager]
 *     summary: List managed units of a building
 *     description: |
 *       **Auth:** `requirePermission("building.read")`
 *   post:
 *     tags: [manager]
 *     summary: Add a managed unit (apartment, garage, …) to a building
 *     description: |
 *       **Auth:** `requirePermission("building.manage")`
 */
