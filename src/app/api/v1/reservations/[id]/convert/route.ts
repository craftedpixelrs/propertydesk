import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { requirePermission } from "@/server/permissions/require";
import { convertReservation } from "@/server/services/reservations.service";

const paramsSchema = z.object({ id: z.string().min(1) });
const bodySchema = z.object({
  listPrice: z.union([z.number().positive(), z.string().min(1)]),
  discountType: z.enum(["PERCENTAGE", "FIXED"]).nullable().optional(),
  discountValue: z.union([z.number(), z.string()]).nullable().optional(),
  currency: z.string().length(3).optional(),
  depositAmount: z.union([z.number(), z.string()]).nullable().optional(),
  notes: z.string().max(2000).optional(),
  responsibleUserId: z.string().min(1).optional(),
});

export const POST = apiHandler({ paramsSchema, bodySchema }, async ({ params, body }) => {
  const ctx = await requirePermission("sale.manage");
  const sale = await convertReservation({
    organizationId: ctx.organization.organizationId,
    actorUserId: ctx.session.user.id,
    reservationId: params.id,
    listPrice: body.listPrice,
    discountType: body.discountType ?? null,
    discountValue: body.discountValue ?? null,
    currency: body.currency,
    depositAmount: body.depositAmount ?? null,
    notes: body.notes ?? null,
    responsibleUserId: body.responsibleUserId ?? null,
  });
  return { data: sale, status: 201 };
});
