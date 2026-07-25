import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { requirePermission } from "@/server/permissions/require";
import { deleteBuilding, updateBuilding } from "@/server/services/structure.service";

const paramsSchema = z.object({ id: z.string().min(1) });
const patchSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(500).optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export const PATCH = apiHandler(
  { paramsSchema, bodySchema: patchSchema },
  async ({ params, body }) => {
    const ctx = await requirePermission("inventory.manage");
    const b = await updateBuilding({
      organizationId: ctx.organization.organizationId,
      actorUserId: ctx.session.user.id,
      buildingId: params.id,
      patch: body,
    });
    return { data: b };
  },
);

export const DELETE = apiHandler({ paramsSchema }, async ({ params }) => {
  const ctx = await requirePermission("inventory.manage");
  await deleteBuilding({
    organizationId: ctx.organization.organizationId,
    actorUserId: ctx.session.user.id,
    buildingId: params.id,
  });
  return { data: { ok: true } };
});
