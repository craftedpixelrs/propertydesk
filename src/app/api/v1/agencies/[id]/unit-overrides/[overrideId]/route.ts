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

/**
 * @swagger
 * /api/v1/agencies/{id}/unit-overrides/{overrideId}:
 *   delete:
 *     tags:
 *       - agencies
 *     summary: Delete agencies
 *     description: |
 *       **Auth:** `requirePermission("agency.manage")`
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: overrideId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       "200":
 *         description: |
 *           OK
 *       "401":
 *         $ref: "#/components/responses/Unauthenticated"
 *       "403":
 *         $ref: "#/components/responses/Forbidden"
 */
