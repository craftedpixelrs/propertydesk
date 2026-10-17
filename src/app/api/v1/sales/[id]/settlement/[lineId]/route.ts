import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { requirePermission } from "@/server/permissions/require";
import { removeSettlementLine } from "@/server/services/sales/settlement.service";

const paramsSchema = z.object({
  id: z.string().min(1),
  lineId: z.string().min(1),
});

export const DELETE = apiHandler({ paramsSchema }, async ({ params }) => {
  const ctx = await requirePermission("sale.settlement");
  const data = await removeSettlementLine({
    organizationId: ctx.organization.organizationId,
    actorUserId: ctx.session.user.id,
    saleId: params.id,
    lineId: params.lineId,
  });
  return { data };
});
