import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { requirePermission } from "@/server/permissions/require";
import { softDeleteDocument } from "@/server/services/documents.service";

const paramsSchema = z.object({ id: z.string().min(1) });

export const DELETE = apiHandler({ paramsSchema }, async ({ params }) => {
  const ctx = await requirePermission("document.manage");
  const doc = await softDeleteDocument({
    organizationId: ctx.organization.organizationId,
    actorUserId: ctx.session.user.id,
    documentId: params.id,
  });
  return { data: doc };
});

/**
 * @swagger
 * /api/v1/documents/{id}:
 *   delete:
 *     tags:
 *       - documents
 *     summary: Delete documents
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
