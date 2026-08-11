import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { requirePermission } from "@/server/permissions/require";
import { markContractSent } from "@/server/services/sales/contracts.service";

const paramsSchema = z.object({ id: z.string().min(1) });

export const POST = apiHandler({ paramsSchema }, async ({ params }) => {
  const ctx = await requirePermission("sale.manage");
  const result = await markContractSent({
    organizationId: ctx.organization.organizationId,
    actorUserId: ctx.session.user.id,
    saleId: params.id,
  });
  return { data: result };
});
