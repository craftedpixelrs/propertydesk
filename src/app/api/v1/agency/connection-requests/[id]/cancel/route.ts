import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { DomainErrors } from "@/lib/errors";
import { requirePermission } from "@/server/permissions/require";
import { cancelConnectionRequest } from "@/server/services/agencies/connection-request.service";

const paramsSchema = z.object({ id: z.string().min(1) });

export const POST = apiHandler({ paramsSchema }, async ({ params }) => {
  const ctx = await requirePermission("organization.members:manage");
  if (ctx.organization.organizationType !== "AGENCY") {
    throw DomainErrors.forbidden("Samo agencija može otkazati sopstveni zahtev.");
  }
  const updated = await cancelConnectionRequest({
    agencyOrganizationId: ctx.organization.organizationId,
    actorUserId: ctx.session.user.id,
    requestId: params.id,
  });
  return { data: updated };
});

/**
 * @swagger
 * /api/v1/agency/connection-requests/{id}/cancel:
 *   post:
 *     tags:
 *       - agency
 *     summary: Otkaži zahtev za saradnju
 *     description: |
 *       **Auth:** `requirePermission("organization.members:manage")` + AGENCY org
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
