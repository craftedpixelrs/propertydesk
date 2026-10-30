import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { requirePermission } from "@/server/permissions/require";
import {
  closeVoting,
  getAssembly,
  openVoting,
  updateAssembly,
} from "@/server/services/manager/assemblies.service";

const paramsSchema = z.object({ id: z.string().min(1) });

const patchSchema = z.object({
  title: z.string().trim().min(2).max(200).optional(),
  description: z.string().max(5000).nullable().optional(),
  type: z.enum(["REGULAR", "EXTRAORDINARY", "WRITTEN_PROCEDURE"]).optional(),
  scheduledAt: z.coerce.date().optional(),
  votingOpensAt: z.coerce.date().nullable().optional(),
  votingClosesAt: z.coerce.date().nullable().optional(),
  location: z.string().max(200).nullable().optional(),
  quorumNote: z.string().max(1000).nullable().optional(),
  action: z.enum(["open-voting", "close-voting"]).optional(),
});

export const GET = apiHandler({ paramsSchema }, async ({ params }) => {
  const ctx = await requirePermission("assembly.read");
  const row = await getAssembly(ctx.organization.organizationId, params.id);
  return { data: row };
});

export const PATCH = apiHandler(
  { paramsSchema, bodySchema: patchSchema },
  async ({ params, body }) => {
    const ctx = await requirePermission("assembly.manage");
    const { action, ...patch } = body;
    if (action === "open-voting") {
      const row = await openVoting({
        organizationId: ctx.organization.organizationId,
        actorUserId: ctx.session.user.id,
        assemblyId: params.id,
      });
      return { data: row };
    }
    if (action === "close-voting") {
      const result = await closeVoting({
        organizationId: ctx.organization.organizationId,
        actorUserId: ctx.session.user.id,
        assemblyId: params.id,
      });
      return { data: result };
    }
    const row = await updateAssembly({
      organizationId: ctx.organization.organizationId,
      actorUserId: ctx.session.user.id,
      assemblyId: params.id,
      patch,
    });
    return { data: row };
  },
);

/**
 * @swagger
 * /api/v1/manager/assemblies/{id}:
 *   get:
 *     tags: [manager]
 *     summary: Read an assembly with agenda + votes
 *     description: |
 *       **Auth:** `requirePermission("assembly.read")`
 *   patch:
 *     tags: [manager]
 *     summary: Update assembly or trigger a state transition
 *     description: |
 *       **Auth:** `requirePermission("assembly.manage")`
 */
