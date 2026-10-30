import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { requirePermission } from "@/server/permissions/require";
import { recordDuesPayment } from "@/server/services/manager/dues.service";

const paramsSchema = z.object({ id: z.string().min(1) });

const bodySchema = z.object({
  amount: z.coerce.number().positive(),
  paidAt: z.coerce.date().optional(),
  method: z.enum(["BANK_TRANSFER", "CARD", "OTHER"]).optional(),
  reference: z.string().max(60).nullable().optional(),
  bankTransactionId: z.string().max(100).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
});

export const POST = apiHandler({ paramsSchema, bodySchema }, async ({ params, body }) => {
  const ctx = await requirePermission("dues.payment.record");
  const payment = await recordDuesPayment({
    organizationId: ctx.organization.organizationId,
    actorUserId: ctx.session.user.id,
    chargeId: params.id,
    amount: body.amount,
    paidAt: body.paidAt,
    method: body.method,
    reference: body.reference,
    bankTransactionId: body.bankTransactionId,
    notes: body.notes,
  });
  return { data: payment, status: 201 };
});

/**
 * @swagger
 * /api/v1/manager/dues/{id}/payments:
 *   post:
 *     tags: [manager]
 *     summary: Record a dues payment
 *     description: |
 *       **Auth:** `requirePermission("dues.payment.record")`
 */
