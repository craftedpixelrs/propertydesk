import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { ApiError } from "@/lib/api/errors";
import { requireSuperAdmin } from "@/server/permissions/require";
import { prisma } from "@/server/db/prisma";
import { issueSubscriptionInvoiceNow } from "@/server/services/billing/invoices/generation.service";

const paramsSchema = z.object({ id: z.string().min(1) });
const bodySchema = z.object({}).optional();

export const POST = apiHandler(
  { paramsSchema, bodySchema },
  async ({ params }) => {
    const ctx = await requireSuperAdmin();
    const sub = await prisma.organizationSubscription.findUnique({
      where: { id: params.id },
      select: { organizationId: true },
    });
    if (!sub) throw new ApiError("NOT_FOUND", "Pretplata nije pronađena.");
    const invoice = await issueSubscriptionInvoiceNow(
      sub.organizationId,
      ctx.session.user.id,
    );
    return { data: invoice };
  },
);

/**
 * @swagger
 * /api/v1/billing/subscriptions/{id}/issue-invoice:
 *   post:
 *     tags:
 *       - billing
 *     summary: Issue the current subscription invoice now
 *     description: |
 *       **Auth:** `requireSuperAdmin() — platform SUPER_ADMIN`
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       "200":
 *         description: OK
 *       "401":
 *         $ref: "#/components/responses/Unauthenticated"
 *       "403":
 *         $ref: "#/components/responses/Forbidden"
 */
