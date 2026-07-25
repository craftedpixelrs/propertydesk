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
