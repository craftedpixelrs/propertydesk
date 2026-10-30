import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { requirePermission } from "@/server/permissions/require";
import { archiveManagedBuilding } from "@/server/services/manager/buildings.service";

const paramsSchema = z.object({ id: z.string().min(1) });
const bodySchema = z.object({ reason: z.string().max(500).nullable().optional() });

export const POST = apiHandler({ paramsSchema, bodySchema }, async ({ params, body }) => {
  const ctx = await requirePermission("building.manage");
  const row = await archiveManagedBuilding({
    organizationId: ctx.organization.organizationId,
    actorUserId: ctx.session.user.id,
    buildingId: params.id,
    reason: body?.reason ?? null,
  });
  return { data: row };
});

/**
 * @swagger
 * /api/v1/manager/buildings/{id}/archive:
 *   post:
 *     tags: [manager]
 *     summary: Archive a managed building (soft, reversible)
 *     description: |
 *       **Auth:** `requirePermission("building.manage")`
 */
