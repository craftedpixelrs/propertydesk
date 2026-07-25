import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { requirePermission } from "@/server/permissions/require";
import {
  reactivateConnection,
  suspendConnection,
  terminateConnection,
} from "@/server/services/agencies/agencies.service";

const paramsSchema = z.object({ id: z.string().min(1) });
const bodySchema = z.object({
  action: z.enum(["SUSPEND", "REACTIVATE", "TERMINATE"]),
  reason: z.string().max(2000).optional(),
});

export const POST = apiHandler(
  { paramsSchema, bodySchema },
  async ({ params, body }) => {
    const ctx = await requirePermission("agency.manage");
    if (body.action === "SUSPEND") {
      const updated = await suspendConnection({
        investorOrganizationId: ctx.organization.organizationId,
        actorUserId: ctx.session.user.id,
        connectionId: params.id,
        reason: body.reason,
      });
      return { data: updated };
    }
    if (body.action === "REACTIVATE") {
      const updated = await reactivateConnection({
        investorOrganizationId: ctx.organization.organizationId,
        actorUserId: ctx.session.user.id,
        connectionId: params.id,
      });
      return { data: updated };
    }
    const updated = await terminateConnection({
      investorOrganizationId: ctx.organization.organizationId,
      actorUserId: ctx.session.user.id,
      connectionId: params.id,
      reason: body.reason,
    });
    return { data: updated };
  },
);
