import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { DomainErrors } from "@/lib/errors";
import { requirePermission } from "@/server/permissions/require";
import {
  acceptConnectionRequest,
  rejectConnectionRequest,
} from "@/server/services/agencies/connection-request.service";

const paramsSchema = z.object({ id: z.string().min(1) });
const bodySchema = z.object({
  action: z.enum(["ACCEPT", "REJECT"]),
  reason: z.string().max(2000).optional(),
});

export const POST = apiHandler(
  { paramsSchema, bodySchema },
  async ({ params, body }) => {
    const ctx = await requirePermission("agency.manage");
    if (ctx.organization.organizationType !== "INVESTOR") {
      throw DomainErrors.forbidden("Samo investitor može obraditi zahtev.");
    }
    if (body.action === "ACCEPT") {
      const result = await acceptConnectionRequest({
        investorOrganizationId: ctx.organization.organizationId,
        actorUserId: ctx.session.user.id,
        requestId: params.id,
      });
      return { data: result };
    }
    const updated = await rejectConnectionRequest({
      investorOrganizationId: ctx.organization.organizationId,
      actorUserId: ctx.session.user.id,
      requestId: params.id,
      reason: body.reason,
    });
    return { data: updated };
  },
);

/**
 * @swagger
 * /api/v1/agencies/connection-requests/{id}/respond:
 *   post:
 *     tags:
 *       - agencies
 *     summary: Prihvati ili odbij zahtev agencije
 *     description: |
 *       **Auth:** `requirePermission("agency.manage")` + INVESTOR org
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       "200":
 *         description: OK
 */
