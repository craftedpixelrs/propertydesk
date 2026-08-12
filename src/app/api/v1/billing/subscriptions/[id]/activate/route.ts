import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { ApiError } from "@/lib/api/errors";
import { requireSuperAdmin } from "@/server/permissions/require";
import { prisma } from "@/server/db/prisma";
import { activateSubscription } from "@/server/services/billing/subscriptions.service";
import type { BillingCycle, BillingPaymentMethod } from "@prisma/client";

const paramsSchema = z.object({ id: z.string().min(1) });
const bodySchema = z.object({
  reason: z.string().min(2).max(500),
  cycle: z.enum(["MONTHLY", "QUARTERLY", "SEMI_ANNUAL", "ANNUAL", "CUSTOM"]).optional(),
  paymentMethod: z
    .enum(["BANK_TRANSFER", "CARD", "MANUAL", "IPS_QR", "OTHER"])
    .optional(),
  customPrice: z.number().min(0).optional(),
  customInvoiceNote: z.string().max(2000).optional().nullable(),
});

/** POST /api/v1/billing/subscriptions/{id}/activate */
export const POST = apiHandler(
  { paramsSchema, bodySchema },
  async ({ params, body }) => {
    const ctx = await requireSuperAdmin();
    const sub = await prisma.organizationSubscription.findUnique({
      where: { id: params.id },
      select: { organizationId: true },
    });
    if (!sub) throw new ApiError("NOT_FOUND", "Pretplata nije pronađena.");
    const updated = await activateSubscription(
      {
        organizationId: sub.organizationId,
        reason: body.reason,
        cycle: body.cycle as BillingCycle | undefined,
        paymentMethod: body.paymentMethod as BillingPaymentMethod | undefined,
        customPrice: body.customPrice,
        customInvoiceNote: body.customInvoiceNote,
      },
      ctx.session.user.id,
    );
    return { data: updated };
  },
);

/**
 * @swagger
 * /api/v1/billing/subscriptions/{id}/activate:
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
