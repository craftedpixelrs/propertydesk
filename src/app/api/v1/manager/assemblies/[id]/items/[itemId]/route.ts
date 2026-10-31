import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { requirePermission } from "@/server/permissions/require";
import { removeAgendaItem } from "@/server/services/manager/assemblies.service";

const paramsSchema = z.object({
  id: z.string().min(1),
  itemId: z.string().min(1),
});

export const DELETE = apiHandler({ paramsSchema }, async ({ params }) => {
  const ctx = await requirePermission("assembly.manage");
  await removeAgendaItem({
    organizationId: ctx.organization.organizationId,
    actorUserId: ctx.session.user.id,
    assemblyId: params.id,
    itemId: params.itemId,
  });
  return { data: { ok: true } };
});

/**
 * @swagger
 * /api/v1/manager/assemblies/{id}/items/{itemId}:
 *   delete:
 *     tags: [manager]
 *     summary: Remove an agenda item before voting opens
 *     description: |
 *       **Auth:** `requirePermission("assembly.manage")`
 */
