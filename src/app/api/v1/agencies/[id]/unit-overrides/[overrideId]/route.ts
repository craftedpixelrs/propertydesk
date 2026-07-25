import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { requirePermission } from "@/server/permissions/require";
import { removeUnitOverride } from "@/server/services/agencies/agencies.service";

const paramsSchema = z.object({
  id: z.string().min(1),
  overrideId: z.string().min(1),
});

export const DELETE = apiHandler({ paramsSchema }, async ({ params }) => {
  const ctx = await requirePermission("agency.manage");
  await removeUnitOverride({
    investorOrganizationId: ctx.organization.organizationId,
    actorUserId: ctx.session.user.id,
    connectionId: params.id,
    overrideId: params.overrideId,
  });
  return { data: { ok: true } };
});
