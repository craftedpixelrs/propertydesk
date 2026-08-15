import { z } from "zod";
import { NextResponse } from "next/server";

import { apiHandler } from "@/lib/api/handler";
import { requirePermission } from "@/server/permissions/require";
import { getSignedDownloadUrl } from "@/server/services/documents.service";
import { storage } from "@/server/storage";

const paramsSchema = z.object({ id: z.string().min(1) });

export const GET = apiHandler({ paramsSchema }, async ({ params }) => {
  const ctx = await requirePermission("document.read");
  const orgType = ctx.isSuperAdmin
    ? "PLATFORM"
    : ctx.organization.organizationType ?? "INVESTOR";
  const { doc, url } = await getSignedDownloadUrl({
    actor: {
      organizationId: ctx.organization.organizationId,
      organizationType: orgType,
      userId: ctx.session.user.id,
    },
    documentId: params.id,
  });

  // Local storage has no signed URL — stream the file through this route.
  if (url.startsWith("local:")) {
    const buffer = await storage().read(doc.storageKey);
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "content-type": doc.mimeType,
        "content-disposition": `inline; filename="${encodeURIComponent(doc.originalFileName)}"`,
        "cache-control": "private, max-age=60",
      },
    });
  }

  return { data: { url } };
});

/**
 * @swagger
 * /api/v1/documents/{id}/download:
 *   get:
 *     tags:
 *       - documents
 *     summary: List / read documents
 *     description: |
 *       **Auth:** `requirePermission("document.read")`
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
