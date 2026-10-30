import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { requirePermission } from "@/server/permissions/require";
import { listEntrances, upsertEntrance } from "@/server/services/manager/buildings.service";

const paramsSchema = z.object({ id: z.string().min(1) });

const upsertSchema = z.object({
  code: z.string().trim().min(1).max(10),
  label: z.string().max(80).nullable().optional(),
  sortOrder: z.number().int().min(0).max(999).optional(),
});

export const GET = apiHandler({ paramsSchema }, async ({ params }) => {
  const ctx = await requirePermission("building.read");
  const rows = await listEntrances(ctx.organization.organizationId, params.id);
  return { data: rows };
});

export const POST = apiHandler(
  { paramsSchema, bodySchema: upsertSchema },
  async ({ params, body }) => {
    const ctx = await requirePermission("building.manage");
    const row = await upsertEntrance({
      organizationId: ctx.organization.organizationId,
      actorUserId: ctx.session.user.id,
      buildingId: params.id,
      code: body.code,
      label: body.label ?? null,
      sortOrder: body.sortOrder,
    });
    return { data: row, status: 201 };
  },
);

/**
 * @swagger
 * /api/v1/manager/buildings/{id}/entrances:
 *   get:
 *     tags: [manager]
 *     summary: List entrances of a managed building
 *     description: |
 *       **Auth:** `requirePermission("building.read")`
 *   post:
 *     tags: [manager]
 *     summary: Create or update an entrance (by code)
 *     description: |
 *       **Auth:** `requirePermission("building.manage")`
 */
