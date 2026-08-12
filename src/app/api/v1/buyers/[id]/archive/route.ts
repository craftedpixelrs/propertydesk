import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { requirePermission } from "@/server/permissions/require";
import { archiveBuyer } from "@/server/services/buyers.service";

const paramsSchema = z.object({ id: z.string().min(1) });

export const POST = apiHandler({ paramsSchema }, async ({ params }) => {
  const ctx = await requirePermission("lead.manage");
  await archiveBuyer({
    organizationId: ctx.organization.organizationId,
    actorUserId: ctx.session.user.id,
    buyerId: params.id,
  });
  return { data: { ok: true } };
});

/**
 * @swagger
 * /api/v1/buyers/{id}/archive:
 *   post:
 *     tags:
 *       - buyers
 *     summary: Create buyers
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
