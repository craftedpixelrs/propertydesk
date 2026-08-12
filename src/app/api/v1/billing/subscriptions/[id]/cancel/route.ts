import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { ApiError } from "@/lib/api/errors";
import { requireSuperAdmin } from "@/server/permissions/require";
import { prisma } from "@/server/db/prisma";
import { cancelSubscription } from "@/server/services/billing/subscriptions.service";

const paramsSchema = z.object({ id: z.string().min(1) });
const bodySchema = z.object({
  reason: z.string().min(2).max(500),
  immediate: z.boolean().optional(),
});

export const POST = apiHandler(
  { paramsSchema, bodySchema },
  async ({ params, body }) => {
    const ctx = await requireSuperAdmin();
    const sub = await prisma.organizationSubscription.findUnique({
      where: { id: params.id },
      select: { organizationId: true },
    });
    if (!sub) throw new ApiError("NOT_FOUND", "Pretplata nije pronađena.");
    const updated = await cancelSubscription(
      sub.organizationId,
      body.reason,
      ctx.session.user.id,
      { immediate: body.immediate ?? false },
    );
    return { data: updated };
  },
);

/**
 * @swagger
 * /api/v1/billing/subscriptions/{id}/cancel:
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
