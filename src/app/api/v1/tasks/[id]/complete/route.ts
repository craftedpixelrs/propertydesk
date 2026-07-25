import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { requirePermission } from "@/server/permissions/require";
import { completeTask } from "@/server/services/tasks.service";

const paramsSchema = z.object({ id: z.string().min(1) });

export const POST = apiHandler({ paramsSchema }, async ({ params }) => {
  const ctx = await requirePermission("lead.manage");
  const updated = await completeTask({
    organizationId: ctx.organization.organizationId,
    actorUserId: ctx.session.user.id,
    taskId: params.id,
  });
  return { data: updated };
});
