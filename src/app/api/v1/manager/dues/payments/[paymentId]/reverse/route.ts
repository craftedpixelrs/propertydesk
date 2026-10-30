import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { requirePermission } from "@/server/permissions/require";
import { reverseDuesPayment } from "@/server/services/manager/dues.service";

const paramsSchema = z.object({ paymentId: z.string().min(1) });
const bodySchema = z.object({ reason: z.string().trim().min(2).max(500) });

export const POST = apiHandler({ paramsSchema, bodySchema }, async ({ params, body }) => {
  const ctx = await requirePermission("dues.payment.reverse");
  await reverseDuesPayment({
    organizationId: ctx.organization.organizationId,
    actorUserId: ctx.session.user.id,
    paymentId: params.paymentId,
    reason: body.reason,
  });
  return { data: { ok: true } };
});

/**
 * @swagger
 * /api/v1/manager/dues/payments/{paymentId}/reverse:
 *   post:
 *     tags: [manager]
 *     summary: Reverse a dues payment (adjusts paid amount + status)
 *     description: |
 *       **Auth:** `requirePermission("dues.payment.reverse")`
 */
