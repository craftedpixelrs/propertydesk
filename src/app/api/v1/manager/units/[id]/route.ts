import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { requirePermission } from "@/server/permissions/require";
import { archiveManagedUnit, updateManagedUnit } from "@/server/services/manager/buildings.service";

const paramsSchema = z.object({ id: z.string().min(1) });

const patchSchema = z.object({
  code: z.string().trim().min(1).max(40).optional(),
  entranceId: z.string().min(1).nullable().optional(),
  type: z
    .enum(["APARTMENT", "COMMERCIAL", "GARAGE", "PARKING_SPACE", "STORAGE", "OFFICE", "OTHER"])
    .optional(),
  floor: z.number().int().min(-5).max(100).nullable().optional(),
  totalArea: z.number().positive().max(10000).optional(),
  participationShare: z.number().min(0).max(10000).optional(),
  roomCount: z.number().min(0).max(99).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
});

export const PATCH = apiHandler(
  { paramsSchema, bodySchema: patchSchema },
  async ({ params, body }) => {
    const ctx = await requirePermission("building.manage");
    const row = await updateManagedUnit({
      organizationId: ctx.organization.organizationId,
      actorUserId: ctx.session.user.id,
      unitId: params.id,
      patch: body,
    });
    return { data: row };
  },
);

export const DELETE = apiHandler({ paramsSchema }, async ({ params }) => {
  const ctx = await requirePermission("building.manage");
  const row = await archiveManagedUnit({
    organizationId: ctx.organization.organizationId,
    actorUserId: ctx.session.user.id,
    unitId: params.id,
  });
  return { data: row };
});

/**
 * @swagger
 * /api/v1/manager/units/{id}:
 *   patch:
 *     tags: [manager]
 *     summary: Update a managed unit
 *     description: |
 *       **Auth:** `requirePermission("building.manage")`
 *   delete:
 *     tags: [manager]
 *     summary: Archive a managed unit (soft)
 *     description: |
 *       **Auth:** `requirePermission("building.manage")`
 */
