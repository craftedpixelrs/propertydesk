import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { requirePermission } from "@/server/permissions/require";
import {
  contractSale,
  handOverSale,
  markPreContract,
  markSalePaid,
} from "@/server/services/sales/sales.service";

const paramsSchema = z.object({ id: z.string().min(1) });
const bodySchema = z.object({
  target: z.enum(["PRE_CONTRACT", "CONTRACTED", "PAID", "HANDED_OVER"]),
  expectedVersion: z.number().int().nonnegative().optional(),
});

export const POST = apiHandler({ paramsSchema, bodySchema }, async ({ params, body }) => {
  const ctx = await requirePermission("sale.manage");
  const args = {
    organizationId: ctx.organization.organizationId,
    actorUserId: ctx.session.user.id,
    saleId: params.id,
    expectedVersion: body.expectedVersion,
  };
  switch (body.target) {
    case "PRE_CONTRACT":
      return { data: await markPreContract(args) };
    case "CONTRACTED":
      return { data: await contractSale(args) };
    case "PAID":
      return { data: await markSalePaid(args) };
    case "HANDED_OVER":
      return { data: await handOverSale(args) };
  }
});

/**
 * @swagger
 * /api/v1/sales/{id}/status:
 *   post:
 *     tags:
 *       - sales
 *     summary: Create sales
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
