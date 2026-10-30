import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { requirePermission } from "@/server/permissions/require";
import { createAssembly, listAssemblies } from "@/server/services/manager/assemblies.service";

const AGENDA_ITEM = z.object({
  title: z.string().trim().min(2).max(200),
  description: z.string().max(5000).nullable().optional(),
  voteKind: z.enum(["DECISION", "INFORMATION", "ELECTION"]).optional(),
  majority: z.enum(["SIMPLE", "ABSOLUTE", "TWO_THIRDS"]).optional(),
  sortOrder: z.number().int().nonnegative().optional(),
});

const createSchema = z.object({
  buildingId: z.string().min(1),
  title: z.string().trim().min(2).max(200),
  description: z.string().max(5000).nullable().optional(),
  type: z.enum(["REGULAR", "EXTRAORDINARY", "WRITTEN_PROCEDURE"]).optional(),
  scheduledAt: z.coerce.date(),
  votingOpensAt: z.coerce.date().nullable().optional(),
  votingClosesAt: z.coerce.date().nullable().optional(),
  location: z.string().max(200).nullable().optional(),
  quorumNote: z.string().max(1000).nullable().optional(),
  agenda: z.array(AGENDA_ITEM).max(50).optional(),
});

export const GET = apiHandler({}, async ({ searchParams }) => {
  const ctx = await requirePermission("assembly.read");
  const buildingId = searchParams.get("buildingId") ?? undefined;
  const rows = await listAssemblies({
    organizationId: ctx.organization.organizationId,
    buildingId,
  });
  return { data: rows };
});

export const POST = apiHandler({ bodySchema: createSchema }, async ({ body }) => {
  const ctx = await requirePermission("assembly.manage");
  const assembly = await createAssembly({
    organizationId: ctx.organization.organizationId,
    actorUserId: ctx.session.user.id,
    ...body,
  });
  return { data: assembly, status: 201 };
});

/**
 * @swagger
 * /api/v1/manager/assemblies:
 *   get:
 *     tags: [manager]
 *     summary: List building assemblies
 *     description: |
 *       **Auth:** `requirePermission("assembly.read")`
 *   post:
 *     tags: [manager]
 *     summary: Schedule a new assembly with agenda items
 *     description: |
 *       **Auth:** `requirePermission("assembly.manage")`
 */
