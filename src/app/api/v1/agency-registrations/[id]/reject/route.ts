import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { requirePermission } from "@/server/permissions/require";
import { rejectRegistration } from "@/server/services/agencies/registrations.service";

const paramsSchema = z.object({ id: z.string().min(1) });
const bodySchema = z.object({
  reason: z.string().max(2000).optional(),
});

export const POST = apiHandler(
  { paramsSchema, bodySchema },
  async ({ params, body }) => {
    const ctx = await requirePermission("agency.manage");
    const updated = await rejectRegistration({
      investorOrganizationId: ctx.organization.organizationId,
      actorUserId: ctx.session.user.id,
      registrationId: params.id,
      reason: body.reason,
    });
    return { data: updated };
  },
);
