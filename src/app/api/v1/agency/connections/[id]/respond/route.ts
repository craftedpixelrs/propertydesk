import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { requirePermission } from "@/server/permissions/require";
import {
  acceptInvitation,
  rejectInvitation,
} from "@/server/services/agencies/connection.service";
import { DomainErrors } from "@/lib/errors";

const paramsSchema = z.object({ id: z.string().min(1) });
const bodySchema = z.object({
  action: z.enum(["ACCEPT", "REJECT"]),
  reason: z.string().max(2000).optional(),
});

export const POST = apiHandler(
  { paramsSchema, bodySchema },
  async ({ params, body }) => {
    const ctx = await requirePermission("organization.manage");
    if (ctx.organization.organizationType !== "AGENCY") {
      throw DomainErrors.forbidden("Ovaj portal je namenjen agencijskim organizacijama.");
    }
    if (body.action === "ACCEPT") {
      const updated = await acceptInvitation({
        agencyOrganizationId: ctx.organization.organizationId,
        actorUserId: ctx.session.user.id,
        connectionId: params.id,
      });
      return { data: updated };
    }
    const updated = await rejectInvitation({
      agencyOrganizationId: ctx.organization.organizationId,
      actorUserId: ctx.session.user.id,
      connectionId: params.id,
      reason: body.reason,
    });
    return { data: updated };
  },
);

/**
 * @swagger
 * /api/v1/agency/connections/{id}/respond:
 *   post:
 *     tags:
 *       - agency
 *     summary: Create agency
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             additionalProperties: true
 *     responses:
 *       "200":
 *         description: OK
 *       "401":
 *         $ref: "#/components/responses/Unauthenticated"
 *       "403":
 *         $ref: "#/components/responses/Forbidden"
 */
