import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { requirePermission } from "@/server/permissions/require";
import { publishBuildingNotice } from "@/server/services/manager/notices.service";

const paramsSchema = z.object({ id: z.string().min(1) });

export const POST = apiHandler({ paramsSchema }, async ({ params }) => {
  const ctx = await requirePermission("notice.manage");
  const notice = await publishBuildingNotice({
    organizationId: ctx.organization.organizationId,
    actorUserId: ctx.session.user.id,
    noticeId: params.id,
  });
  return { data: notice };
});

/**
 * @swagger
 * /api/v1/manager/notices/{id}/publish:
 *   post:
 *     tags: [manager]
 *     summary: Publish a draft notice (emails residents according to channel)
 *     description: |
 *       **Auth:** `requirePermission("notice.manage")`
 */
