import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { requirePermission } from "@/server/permissions/require";
import { rejectHandoverRequest } from "@/server/services/manager/handover.service";

const paramsSchema = z.object({ id: z.string().min(1) });
const bodySchema = z.object({
  reason: z.string().optional().nullable(),
});

export const POST = apiHandler({ paramsSchema, bodySchema }, async ({ params, body }) => {
  const ctx = await requirePermission("building.handover");
  const row = await rejectHandoverRequest({
    targetOrganizationId: ctx.organization.organizationId,
    actorUserId: ctx.session.user.id,
    requestId: params.id,
    reason: body.reason ?? null,
  });
  return { data: row };
});

/**
 * @swagger
 * /api/v1/manager/handovers/{id}/reject:
 *   post:
 *     tags: [manager]
 *     summary: Manager-side — reject a handover request
 *     description: |
 *       **Auth:** `requirePermission("building.handover")` (MANAGER org)
 */
