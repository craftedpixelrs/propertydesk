import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { requirePermission } from "@/server/permissions/require";
import { rotateReferralCode } from "@/server/services/agencies/agencies.service";

const bodySchema = z.object({
  connectionId: z.string().min(1),
});

export const POST = apiHandler({ bodySchema }, async ({ body }) => {
  const ctx = await requirePermission("agency.read");
  const data = await rotateReferralCode({
    agencyOrganizationId: ctx.organization.organizationId,
    actorUserId: ctx.session.user.id,
    connectionId: body.connectionId,
  });
  return { data };
});

/**
 * @swagger
 * /api/v1/agency/referral/rotate:
 *   post:
 *     tags:
 *       - agency
 *     summary: Create agency
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
