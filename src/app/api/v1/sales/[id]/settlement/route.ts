import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { requirePermission } from "@/server/permissions/require";
import { addSettlementLine } from "@/server/services/sales/settlement.service";

const paramsSchema = z.object({ id: z.string().min(1) });

const bodySchema = z.object({
  kind: z.enum(["DEDUCTION", "SURCHARGE"]),
  presetCode: z.string().min(1).max(40),
  label: z.string().max(80).nullable().optional(),
  amount: z.union([z.number(), z.string()]),
  note: z.string().max(300).nullable().optional(),
});

export const POST = apiHandler({ paramsSchema, bodySchema }, async ({ params, body }) => {
  const ctx = await requirePermission("sale.settlement");
  const data = await addSettlementLine({
    organizationId: ctx.organization.organizationId,
    actorUserId: ctx.session.user.id,
    saleId: params.id,
    kind: body.kind,
    presetCode: body.presetCode,
    label: body.label,
    amount: body.amount,
    note: body.note,
  });
  return { data };
});
