import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { requirePermission } from "@/server/permissions/require";
import { acceptHandoverRequest } from "@/server/services/manager/handover.service";

const paramsSchema = z.object({ id: z.string().min(1) });
const bodySchema = z.object({
  targetBuildingId: z.string().min(1).optional().nullable(),
  newBuildingName: z.string().min(1).optional().nullable(),
  newBuildingAddress: z.string().min(1).optional().nullable(),
  newBuildingCity: z.string().min(1).optional().nullable(),
});

export const POST = apiHandler({ paramsSchema, bodySchema }, async ({ params, body }) => {
  const ctx = await requirePermission("building.handover");
  const row = await acceptHandoverRequest({
    targetOrganizationId: ctx.organization.organizationId,
    actorUserId: ctx.session.user.id,
    requestId: params.id,
    targetBuildingId: body.targetBuildingId ?? null,
    newBuildingName: body.newBuildingName ?? null,
    newBuildingAddress: body.newBuildingAddress ?? null,
    newBuildingCity: body.newBuildingCity ?? null,
  });
  return { data: row };
});

/**
 * @swagger
 * /api/v1/manager/handovers/{id}/accept:
 *   post:
 *     tags: [manager]
 *     summary: Manager-side — accept a handover request
 *     description: |
 *       **Auth:** `requirePermission("building.handover")` (MANAGER org)
 *       Copies structure + owners from the source project to the target
 *       managed building in a single transaction. JMBG/identityNumber/taxId
 *       are NEVER copied (ZZPL — data minimization).
 */
