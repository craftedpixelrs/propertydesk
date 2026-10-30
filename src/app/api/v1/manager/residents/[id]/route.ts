import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { requirePermission } from "@/server/permissions/require";
import { revokeResidentAccess } from "@/server/services/manager/residents.service";

const paramsSchema = z.object({ id: z.string().min(1) });

export const DELETE = apiHandler({ paramsSchema }, async ({ params, searchParams }) => {
  const ctx = await requirePermission("resident.manage");
  const reason = searchParams.get("reason") ?? undefined;
  const row = await revokeResidentAccess({
    organizationId: ctx.organization.organizationId,
    actorUserId: ctx.session.user.id,
    accessId: params.id,
    reason,
  });
  return { data: row };
});

/**
 * @swagger
 * /api/v1/manager/residents/{id}:
 *   delete:
 *     tags: [manager]
 *     summary: Revoke a resident's portal access
 *     description: |
 *       **Auth:** `requirePermission("resident.manage")`
 */
