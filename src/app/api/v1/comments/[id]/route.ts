import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { requirePermission } from "@/server/permissions/require";
import { deleteComment } from "@/server/services/comments/comments.service";

const paramsSchema = z.object({ id: z.string().min(1).max(64) });

/**
 * Deleting a comment requires either `buyer.read` or `sale.read` — the
 * service itself enforces authorship, so requiring the more restrictive
 * `.write` variants here would just prevent authors from cleaning up
 * their own typos.
 */
export const DELETE = apiHandler({ paramsSchema }, async ({ params }) => {
  const ctx = await requirePermission("buyer.read").catch(() =>
    requirePermission("sale.read"),
  );
  await deleteComment({
    organizationId: ctx.organization.organizationId,
    actorUserId: ctx.session.user.id,
    commentId: params.id,
    isAdmin: ctx.isSuperAdmin,
  });
  return { data: { ok: true } };
});

/**
 * @swagger
 * /api/v1/comments/{id}:
 *   delete:
 *     tags:
 *       - comments
 *     summary: Delete comments
 *     description: |
 *       **Auth:** `requirePermission("buyer.read") + requirePermission("sale.read")`
 *     parameters:
 *       - in: path
 *         name: id
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
