import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { requirePermission } from "@/server/permissions/require";
import { createFloor } from "@/server/services/structure.service";

const paramsSchema = z.object({ id: z.string().min(1) });
const bodySchema = z.object({
  label: z.string().min(1).max(20),
  number: z.number().int().optional(),
  sortOrder: z.number().int().min(0).optional(),
  floorPlanUrl: z.string().url().optional(),
});

export const POST = apiHandler(
  { paramsSchema, bodySchema },
  async ({ params, body }) => {
    const ctx = await requirePermission("inventory.manage");
    const f = await createFloor({
      organizationId: ctx.organization.organizationId,
      actorUserId: ctx.session.user.id,
      entranceId: params.id,
      ...body,
    });
    return { data: f, status: 201 };
  },
);
