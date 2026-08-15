import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { ApiError } from "@/lib/api/errors";
import { requireSuperAdmin } from "@/server/permissions/require";
import { prisma } from "@/server/db/prisma";
import { extendTrial } from "@/server/services/billing/subscriptions.service";

const paramsSchema = z.object({ id: z.string().min(1) });
const bodySchema = z.object({
  days: z.number().int().min(1).max(365),
  reason: z.string().min(2).max(500),
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
    const updated = await extendTrial(
      sub.organizationId,
      body.days,
      body.reason,
      ctx.session.user.id,
    );
    return { data: updated };
  },
);

/**
 * @swagger
 * /api/v1/billing/subscriptions/{id}/extend-trial:
 *   post:
 *     tags:
 *       - billing
 *     summary: Create billing
 *     description: |
 *       **Auth:** `requireSuperAdmin() — platform SUPER_ADMIN`
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
