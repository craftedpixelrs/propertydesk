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
