import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { requirePermission } from "@/server/permissions/require";
import { approveRegistration } from "@/server/services/agencies/registrations.service";

const paramsSchema = z.object({ id: z.string().min(1) });
const bodySchema = z.object({
  protectionDays: z.number().int().min(0).max(365).optional(),
});

export const POST = apiHandler(
  { paramsSchema, bodySchema },
  async ({ params, body }) => {
    const ctx = await requirePermission("agency.manage");
    const updated = await approveRegistration({
      investorOrganizationId: ctx.organization.organizationId,
      actorUserId: ctx.session.user.id,
      registrationId: params.id,
      protectionDays: body.protectionDays,
    });
    return { data: updated };
  },
);
