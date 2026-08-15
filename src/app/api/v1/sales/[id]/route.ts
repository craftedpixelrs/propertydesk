import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { requirePermission } from "@/server/permissions/require";
import { getSaleById } from "@/server/services/sales/sales.service";

const paramsSchema = z.object({ id: z.string().min(1) });

export const GET = apiHandler({ paramsSchema }, async ({ params }) => {
  const ctx = await requirePermission("sale.read");
  const sale = await getSaleById(ctx.organization.organizationId, params.id);
  return { data: sale };
});

/**
 * @swagger
 * /api/v1/sales/{id}:
 *   get:
 *     tags:
 *       - sales
 *     summary: List / read sales
 *     description: |
 *       **Auth:** `requirePermission("sale.read")`
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       "200":
 *         description: |
 *           OK
 *       "401":
 *         $ref: "#/components/responses/Unauthenticated"
 *       "403":
 *         $ref: "#/components/responses/Forbidden"
 */
