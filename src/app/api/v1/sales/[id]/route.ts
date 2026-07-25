import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { requirePermission } from "@/server/permissions/require";
import { getSaleById } from "@/server/services/sales/sales.service";

const paramsSchema = z.object({ id: z.string().min(1) });

export const GET = apiHandler({ paramsSchema }, async ({ params }) => {
  const ctx = await requirePermission("sale.read");
  const sale = await getSaleById(ctx.organization.organizationId, params.id);
  return { data: sale };
});
