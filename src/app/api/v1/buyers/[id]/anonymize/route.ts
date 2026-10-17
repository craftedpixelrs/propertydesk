import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { requirePermission } from "@/server/permissions/require";
import { anonymizeBuyer } from "@/server/services/buyers.service";

const paramsSchema = z.object({ id: z.string().min(1) });

export const POST = apiHandler({ paramsSchema }, async ({ params }) => {
  const ctx = await requirePermission("buyer.anonymize");
  await anonymizeBuyer({
    organizationId: ctx.organization.organizationId,
    actorUserId: ctx.session.user.id,
    buyerId: params.id,
  });
  return { data: { ok: true } };
});
