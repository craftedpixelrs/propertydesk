import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { requirePermission } from "@/server/permissions/require";
import { restoreManagedBuilding } from "@/server/services/manager/buildings.service";

const paramsSchema = z.object({ id: z.string().min(1) });

export const POST = apiHandler({ paramsSchema }, async ({ params }) => {
  const ctx = await requirePermission("building.manage");
  const row = await restoreManagedBuilding({
    organizationId: ctx.organization.organizationId,
    actorUserId: ctx.session.user.id,
    buildingId: params.id,
  });
  return { data: row };
});

/**
 * @swagger
 * /api/v1/manager/buildings/{id}/restore:
 *   post:
 *     tags: [manager]
 *     summary: Restore an archived managed building
 *     description: |
 *       **Auth:** `requirePermission("building.manage")`
 */
