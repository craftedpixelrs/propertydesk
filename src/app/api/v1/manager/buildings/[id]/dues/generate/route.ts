import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { requirePermission } from "@/server/permissions/require";
import { generateDuesForBuilding } from "@/server/services/manager/dues.service";

const paramsSchema = z.object({ id: z.string().min(1) });

const bodySchema = z.object({
  periodYear: z.number().int().min(2000).max(2100),
  periodMonth: z.number().int().min(1).max(12),
  dueDay: z.number().int().min(1).max(28).optional(),
});

export const POST = apiHandler({ paramsSchema, bodySchema }, async ({ params, body }) => {
  const ctx = await requirePermission("dues.generate");
  const result = await generateDuesForBuilding({
    organizationId: ctx.organization.organizationId,
    actorUserId: ctx.session.user.id,
    buildingId: params.id,
    periodYear: body.periodYear,
    periodMonth: body.periodMonth,
    dueDay: body.dueDay,
  });
  return { data: result, status: 201 };
});

/**
 * @swagger
 * /api/v1/manager/buildings/{id}/dues/generate:
 *   post:
 *     tags: [manager]
 *     summary: Generate monthly dues charges for a building
 *     description: |
 *       **Auth:** `requirePermission("dues.generate")`
 */
