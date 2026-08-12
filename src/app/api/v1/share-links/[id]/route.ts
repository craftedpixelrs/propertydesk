import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { requirePermission } from "@/server/permissions/require";
import { revokeShareLink } from "@/server/services/sharing/share-links.service";

const paramsSchema = z.object({ id: z.string().min(1) });

/**
 * Revoke a share link. Idempotent — a second call on a revoked link
 * simply returns `NotFound`.
 */
export const DELETE = apiHandler({ paramsSchema }, async ({ params }) => {
  const ctx = await requirePermission("inventory.read");
  await revokeShareLink({
    organizationId: ctx.organization.organizationId,
    actorUserId: ctx.session.user.id,
    linkId: params.id,
  });
  return { data: { ok: true } };
});

/**
 * @swagger
 * /api/v1/share-links/{id}:
 *   delete:
 *     tags:
 *       - share-links
 *     summary: Delete share-links
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       "200":
 *         description: OK
 *       "401":
 *         $ref: "#/components/responses/Unauthenticated"
 *       "403":
 *         $ref: "#/components/responses/Forbidden"
 */
