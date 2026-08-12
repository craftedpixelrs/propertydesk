import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { requirePermission } from "@/server/permissions/require";
import { reversePayment } from "@/server/services/sales/payments.service";

const paramsSchema = z.object({ id: z.string().min(1) });
const bodySchema = z.object({ reason: z.string().min(1).max(500) });

export const POST = apiHandler({ paramsSchema, bodySchema }, async ({ params, body }) => {
  const ctx = await requirePermission("payment.manage");
  const payment = await reversePayment({
    organizationId: ctx.organization.organizationId,
    actorUserId: ctx.session.user.id,
    paymentId: params.id,
    reason: body.reason,
  });
  return { data: payment };
});

/**
 * @swagger
 * /api/v1/payments/{id}/reverse:
 *   post:
 *     tags:
 *       - payments
 *     summary: Create payments
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             additionalProperties: true
 *     responses:
 *       "200":
 *         description: OK
 *       "401":
 *         $ref: "#/components/responses/Unauthenticated"
 *       "403":
 *         $ref: "#/components/responses/Forbidden"
 */
