import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { requirePermission } from "@/server/permissions/require";
import { setCoverImage } from "@/server/services/documents.service";

const paramsSchema = z.object({ id: z.string().min(1) });

/**
 * Promote a single document to the cover image for its parent entity.
 *
 * Only image/* MIME types are allowed. Enforced in the service.
 */
export const POST = apiHandler({ paramsSchema }, async ({ params }) => {
  const ctx = await requirePermission("document.manage");
  await setCoverImage({
    organizationId: ctx.organization.organizationId,
    actorUserId: ctx.session.user.id,
    documentId: params.id,
  });
  return { data: { ok: true } };
});

/**
 * @swagger
 * /api/v1/documents/{id}/set-cover:
 *   post:
 *     tags:
 *       - documents
 *     summary: Create documents
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
