import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { requirePermission } from "@/server/permissions/require";
import { reorderDocuments } from "@/server/services/documents.service";

const bodySchema = z.object({
  entityType: z.string().min(1),
  entityId: z.string().min(1),
  orderedDocumentIds: z.array(z.string().min(1)).min(1).max(200),
});

/**
 * Persist a full ordering of documents for a single (entityType,
 * entityId). Whole array is validated + written in one transaction
 * so the gallery UI never sees a partial reorder.
 */
export const POST = apiHandler({ bodySchema }, async ({ body }) => {
  const ctx = await requirePermission("document.manage");
  await reorderDocuments({
    organizationId: ctx.organization.organizationId,
    actorUserId: ctx.session.user.id,
    entityType: body.entityType,
    entityId: body.entityId,
    orderedDocumentIds: body.orderedDocumentIds,
  });
  return { data: { ok: true } };
});

/**
 * @swagger
 * /api/v1/documents/reorder:
 *   post:
 *     tags:
 *       - documents
 *     summary: Create documents
 *     description: |
 *       **Auth:** `requirePermission("document.manage")`
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
