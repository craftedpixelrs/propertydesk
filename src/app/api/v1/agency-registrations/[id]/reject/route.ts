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

/**
 * @swagger
 * /api/v1/agency-registrations/{id}/reject:
 *   post:
 *     tags:
 *       - agency-registrations
 *     summary: Create agency-registrations
 *     description: |
 *       **Auth:** `requirePermission("agency.manage")`
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
 *         description: |
 *           OK
 *       "401":
 *         $ref: "#/components/responses/Unauthenticated"
 *       "403":
 *         $ref: "#/components/responses/Forbidden"
 */
