import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { requirePermission } from "@/server/permissions/require";
import { markAttendance } from "@/server/services/manager/assemblies.service";

const paramsSchema = z.object({ id: z.string().min(1) });

const bodySchema = z.object({
  unitId: z.string().min(1),
  mode: z.enum(["IN_PERSON", "ELECTRONIC", "PROXY"]),
  note: z.string().max(500).nullable().optional(),
});

export const POST = apiHandler({ paramsSchema, bodySchema }, async ({ params, body }) => {
  const ctx = await requirePermission("assembly.manage");
  const row = await markAttendance({
    organizationId: ctx.organization.organizationId,
    actorUserId: ctx.session.user.id,
    assemblyId: params.id,
    unitId: body.unitId,
    mode: body.mode,
    note: body.note,
  });
  return { data: { id: row.id }, status: 201 };
});

/**
 * @swagger
 * /api/v1/manager/assemblies/{id}/attendance:
 *   post:
 *     tags: [manager]
 *     summary: Record that a unit is present, in person or by proxy
 *     description: |
 *       **Auth:** `requirePermission("assembly.manage")`
 *       Presence counts toward quorum. A later vote keeps a proxy mark.
 */
