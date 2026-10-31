import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { requirePermission } from "@/server/permissions/require";
import { addAgendaItem } from "@/server/services/manager/assemblies.service";

const paramsSchema = z.object({ id: z.string().min(1) });

const bodySchema = z.object({
  title: z.string().trim().min(2).max(200),
  description: z.string().max(5000).nullable().optional(),
  voteKind: z.enum(["DECISION", "INFORMATION", "ELECTION"]).optional(),
  majority: z.enum(["SIMPLE", "ABSOLUTE", "TWO_THIRDS"]).optional(),
});

export const POST = apiHandler({ paramsSchema, bodySchema }, async ({ params, body }) => {
  const ctx = await requirePermission("assembly.manage");
  const item = await addAgendaItem({
    organizationId: ctx.organization.organizationId,
    actorUserId: ctx.session.user.id,
    assemblyId: params.id,
    ...body,
  });
  return { data: { id: item.id }, status: 201 };
});

/**
 * @swagger
 * /api/v1/manager/assemblies/{id}/items:
 *   post:
 *     tags: [manager]
 *     summary: Add an agenda item while the assembly is still scheduled
 *     description: |
 *       **Auth:** `requirePermission("assembly.manage")`
 */
