import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { requirePermission } from "@/server/permissions/require";
import { setUnitOverride } from "@/server/services/agencies/agencies.service";

const paramsSchema = z.object({ id: z.string().min(1) });
const bodySchema = z.object({
  unitId: z.string().min(1),
  visible: z.boolean(),
});

export const POST = apiHandler(
  { paramsSchema, bodySchema },
  async ({ params, body }) => {
    const ctx = await requirePermission("agency.manage");
    const override = await setUnitOverride({
      investorOrganizationId: ctx.organization.organizationId,
      actorUserId: ctx.session.user.id,
      connectionId: params.id,
      unitId: body.unitId,
      visible: body.visible,
    });
    return { data: override, status: 201 };
  },
);
