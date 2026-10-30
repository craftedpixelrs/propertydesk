import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { requirePermission } from "@/server/permissions/require";
import { inviteResident } from "@/server/services/manager/residents.service";

const paramsSchema = z.object({ id: z.string().min(1) });

const bodySchema = z.object({
  personId: z.string().min(1),
  email: z.string().email(),
});

export const POST = apiHandler({ paramsSchema, bodySchema }, async ({ params, body }) => {
  const ctx = await requirePermission("resident.manage");
  const access = await inviteResident({
    organizationId: ctx.organization.organizationId,
    actorUserId: ctx.session.user.id,
    unitId: params.id,
    personId: body.personId,
    email: body.email,
  });
  return { data: access, status: 201 };
});

/**
 * @swagger
 * /api/v1/manager/units/{id}/residents:
 *   post:
 *     tags: [manager]
 *     summary: Invite a resident to the portal for a specific unit
 *     description: |
 *       **Auth:** `requirePermission("resident.manage")`
 */
