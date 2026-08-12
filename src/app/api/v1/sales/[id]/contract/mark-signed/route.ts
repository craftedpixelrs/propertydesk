import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { requirePermission } from "@/server/permissions/require";
import { markContractSigned } from "@/server/services/sales/contracts.service";

const paramsSchema = z.object({ id: z.string().min(1) });

export const POST = apiHandler({ paramsSchema }, async ({ params }) => {
  const ctx = await requirePermission("sale.manage");
  const result = await markContractSigned({
    organizationId: ctx.organization.organizationId,
    actorUserId: ctx.session.user.id,
    saleId: params.id,
  });
  return { data: result };
});

/**
 * @swagger
 * /api/v1/sales/{id}/contract/mark-signed:
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
