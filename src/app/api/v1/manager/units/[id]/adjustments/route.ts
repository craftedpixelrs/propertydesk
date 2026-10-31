import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { requirePermission } from "@/server/permissions/require";
import { createDuesAdjustment } from "@/server/services/manager/dues.service";

const paramsSchema = z.object({ id: z.string().min(1) });

const bodySchema = z.object({
  amount: z.coerce.number().refine((value) => value !== 0, "Iznos ne može biti nula."),
  reason: z.string().trim().min(3).max(500),
  effectiveDate: z.coerce.date().optional(),
});

export const POST = apiHandler({ paramsSchema, bodySchema }, async ({ params, body }) => {
  const ctx = await requirePermission("dues.payment.record");
  const row = await createDuesAdjustment({
    organizationId: ctx.organization.organizationId,
    actorUserId: ctx.session.user.id,
    unitId: params.id,
    amount: body.amount,
    reason: body.reason,
    effectiveDate: body.effectiveDate,
  });
  return { data: { id: row.id }, status: 201 };
});

/**
 * @swagger
 * /api/v1/manager/units/{id}/adjustments:
 *   post:
 *     tags: [manager]
 *     summary: Book a per-unit dues adjustment
 *     description: |
 *       Positive amount increases what the unit owes. Negative amount is a credit.
 *       **Auth:** `requirePermission("dues.payment.record")`
 */
