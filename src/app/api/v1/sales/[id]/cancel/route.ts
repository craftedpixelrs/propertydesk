import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { requirePermission } from "@/server/permissions/require";
import { cancelSale } from "@/server/services/sales/sales.service";

const paramsSchema = z.object({ id: z.string().min(1) });
const bodySchema = z.object({
  reason: z.string().min(1).max(500),
  expectedVersion: z.number().int().nonnegative().optional(),
});

export const POST = apiHandler({ paramsSchema, bodySchema }, async ({ params, body }) => {
  const ctx = await requirePermission("sale.manage");
  const result = await cancelSale({
    organizationId: ctx.organization.organizationId,
    actorUserId: ctx.session.user.id,
    saleId: params.id,
    reason: body.reason,
    expectedVersion: body.expectedVersion,
  });
  return { data: result };
});

/**
 * @swagger
 * /api/v1/sales/{id}/cancel:
 *   post:
 *     tags:
 *       - sales
 *     summary: Create sales
 *     description: |
 *       **Auth:** `requirePermission("sale.manage")`
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
 *         description: |
 *           OK
 *       "401":
 *         $ref: "#/components/responses/Unauthenticated"
 *       "403":
 *         $ref: "#/components/responses/Forbidden"
 */
