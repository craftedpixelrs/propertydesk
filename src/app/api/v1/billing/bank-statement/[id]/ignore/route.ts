import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { requireSuperAdmin } from "@/server/permissions/require";
import { ignoreTransaction } from "@/server/services/billing/bank-statement/service";

const paramsSchema = z.object({ id: z.string().min(1) });
const bodySchema = z.object({ reason: z.string().min(2).max(500) });

export const POST = apiHandler(
  { paramsSchema, bodySchema },
  async ({ params, body }) => {
    const ctx = await requireSuperAdmin();
    await ignoreTransaction({
      transactionId: params.id,
      reason: body.reason,
      actorUserId: ctx.session.user.id,
    });
    return { data: { ok: true } };
  },
);

/**
 * @swagger
 * /api/v1/billing/bank-statement/{id}/ignore:
 *   post:
 *     tags:
 *       - billing
 *     summary: Create billing
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
