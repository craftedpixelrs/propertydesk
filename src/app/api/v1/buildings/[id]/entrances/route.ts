import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { requirePermission } from "@/server/permissions/require";
import { createEntrance } from "@/server/services/structure.service";

const paramsSchema = z.object({ id: z.string().min(1) });
const bodySchema = z.object({
  code: z.string().min(1).max(20),
  name: z.string().min(1).max(120),
  sortOrder: z.number().int().min(0).optional(),
});

export const POST = apiHandler(
  { paramsSchema, bodySchema },
  async ({ params, body }) => {
    const ctx = await requirePermission("inventory.manage");
    const e = await createEntrance({
      organizationId: ctx.organization.organizationId,
      actorUserId: ctx.session.user.id,
      buildingId: params.id,
      ...body,
    });
    return { data: e, status: 201 };
  },
);
