import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { requirePermission } from "@/server/permissions/require";
import { castVote } from "@/server/services/manager/assemblies.service";

const paramsSchema = z.object({ id: z.string().min(1) });

const bodySchema = z.object({
  unitId: z.string().min(1),
  choice: z.enum(["YES", "NO", "ABSTAIN"]),
  personId: z.string().min(1).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
});

export const POST = apiHandler({ paramsSchema, bodySchema }, async ({ params, body }) => {
  const ctx = await requirePermission("assembly.vote.cast");
  const vote = await castVote({
    organizationId: ctx.organization.organizationId,
    actorUserId: ctx.session.user.id,
    agendaItemId: params.id,
    ...body,
  });
  return { data: vote, status: 201 };
});

/**
 * @swagger
 * /api/v1/manager/agenda/{id}/vote:
 *   post:
 *     tags: [manager]
 *     summary: Cast / change a vote on an agenda item
 *     description: |
 *       **Auth:** `requirePermission("assembly.vote.cast")`
 */
