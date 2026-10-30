import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { requirePermission } from "@/server/permissions/require";
import { writeOffDuesCharge } from "@/server/services/manager/dues.service";

const paramsSchema = z.object({ id: z.string().min(1) });
const bodySchema = z.object({ reason: z.string().trim().min(2).max(500) });

export const POST = apiHandler({ paramsSchema, bodySchema }, async ({ params, body }) => {
  const ctx = await requirePermission("dues.writeoff");
  const row = await writeOffDuesCharge({
    organizationId: ctx.organization.organizationId,
    actorUserId: ctx.session.user.id,
    chargeId: params.id,
    reason: body.reason,
  });
  return { data: row };
});

/**
 * @swagger
 * /api/v1/manager/dues/{id}/write-off:
 *   post:
 *     tags: [manager]
 *     summary: Write off the remaining debt on a dues charge
 *     description: |
 *       **Auth:** `requirePermission("dues.writeoff")`
 */
