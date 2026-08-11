import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { requirePermission } from "@/server/permissions/require";
import { addInstallmentToExistingPlan } from "@/server/services/sales/payment-plan-templates.service";

const paramsSchema = z.object({ id: z.string().min(1) });

const bodySchema = z.object({
  label: z.string().min(1).max(200),
  amount: z.union([z.number().positive(), z.string().min(1)]),
  dueDate: z.string().min(1),
  notes: z.string().max(500).optional().nullable(),
});

/**
 * Append a single installment to an existing PaymentPlan. The
 * "sum(installments) == finalPrice" invariant is intentionally NOT
 * enforced here — the client shows a yellow banner when the totals
 * diverge, but the write goes through.
 */
export const POST = apiHandler(
  { paramsSchema, bodySchema },
  async ({ params, body }) => {
    const ctx = await requirePermission("payment.manage");
    const installment = await addInstallmentToExistingPlan({
      organizationId: ctx.organization.organizationId,
      actorUserId: ctx.session.user.id,
      saleId: params.id,
      label: body.label,
      amount: body.amount,
      dueDate: body.dueDate,
      notes: body.notes ?? null,
    });
    return { data: installment, status: 201 };
  },
);
