import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { requirePermission } from "@/server/permissions/require";
import { deleteEntrance, updateEntrance } from "@/server/services/structure.service";

const paramsSchema = z.object({ id: z.string().min(1) });
const patchSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export const PATCH = apiHandler(
  { paramsSchema, bodySchema: patchSchema },
  async ({ params, body }) => {
    const ctx = await requirePermission("inventory.manage");
    const e = await updateEntrance({
      organizationId: ctx.organization.organizationId,
      actorUserId: ctx.session.user.id,
      entranceId: params.id,
      patch: body,
    });
    return { data: e };
  },
);

export const DELETE = apiHandler({ paramsSchema }, async ({ params }) => {
  const ctx = await requirePermission("inventory.manage");
  await deleteEntrance({
    organizationId: ctx.organization.organizationId,
    actorUserId: ctx.session.user.id,
    entranceId: params.id,
  });
  return { data: { ok: true } };
});
