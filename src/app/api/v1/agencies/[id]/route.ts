import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { requirePermission } from "@/server/permissions/require";
import {
  getConnectionDetail,
  setProtectionDays,
} from "@/server/services/agencies/agencies.service";

const paramsSchema = z.object({ id: z.string().min(1) });
const patchSchema = z.object({
  defaultProtectionDays: z.number().int().min(0).max(365).optional(),
});

export const GET = apiHandler({ paramsSchema }, async ({ params }) => {
  const ctx = await requirePermission("agency.read");
  const detail = await getConnectionDetail(ctx.organization.organizationId, params.id);
  return { data: detail };
});

export const PATCH = apiHandler(
  { paramsSchema, bodySchema: patchSchema },
  async ({ params, body }) => {
    const ctx = await requirePermission("agency.manage");
    if (body.defaultProtectionDays !== undefined) {
      const updated = await setProtectionDays({
        investorOrganizationId: ctx.organization.organizationId,
        actorUserId: ctx.session.user.id,
        connectionId: params.id,
        days: body.defaultProtectionDays,
      });
      return { data: updated };
    }
    const detail = await getConnectionDetail(ctx.organization.organizationId, params.id);
    return { data: detail };
  },
);
