import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { requireSuperAdmin } from "@/server/permissions/require";
import { deleteExchangeRate } from "@/server/services/billing/exchange-rates/service";

const paramsSchema = z.object({ id: z.string().min(1) });

export const DELETE = apiHandler({ paramsSchema }, async ({ params }) => {
  const ctx = await requireSuperAdmin();
  await deleteExchangeRate(params.id, ctx.session.user.id);
  return { data: { ok: true } };
});
