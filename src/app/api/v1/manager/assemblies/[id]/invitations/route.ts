import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { requirePermission } from "@/server/permissions/require";
import { sendAssemblyInvitations } from "@/server/services/manager/assemblies.service";

const paramsSchema = z.object({ id: z.string().min(1) });

export const POST = apiHandler({ paramsSchema }, async ({ params }) => {
  const ctx = await requirePermission("assembly.manage");
  const result = await sendAssemblyInvitations({
    organizationId: ctx.organization.organizationId,
    actorUserId: ctx.session.user.id,
    assemblyId: params.id,
  });
  return { data: result, status: 201 };
});

/**
 * @swagger
 * /api/v1/manager/assemblies/{id}/invitations:
 *   post:
 *     tags: [manager]
 *     summary: Email every primary owner of this building the assembly invite
 *     description: |
 *       **Auth:** `requirePermission("assembly.manage")`
 */
