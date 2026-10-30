import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { requirePermission } from "@/server/permissions/require";
import { cancelHandoverRequest } from "@/server/services/manager/handover.service";

const paramsSchema = z.object({ id: z.string().min(1) });
const bodySchema = z.object({
  reason: z.string().optional().nullable(),
});

export const POST = apiHandler({ paramsSchema, bodySchema }, async ({ params, body }) => {
  const ctx = await requirePermission("project.handover_manager");
  const row = await cancelHandoverRequest({
    sourceOrganizationId: ctx.organization.organizationId,
    actorUserId: ctx.session.user.id,
    requestId: params.id,
    reason: body.reason ?? null,
  });
  return { data: row };
});

/**
 * @swagger
 * /api/v1/manager/handovers/{id}/cancel:
 *   post:
 *     tags: [manager]
 *     summary: Investor-side — cancel a pending handover request
 *     description: |
 *       **Auth:** `requirePermission("project.handover_manager")` (INVESTOR org)
 */
