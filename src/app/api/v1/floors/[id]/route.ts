import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { requirePermission } from "@/server/permissions/require";
import { deleteFloor, updateFloor } from "@/server/services/structure.service";

const paramsSchema = z.object({ id: z.string().min(1) });
const patchSchema = z.object({
  label: z.string().min(1).max(20).optional(),
  number: z.number().int().nullable().optional(),
  sortOrder: z.number().int().min(0).optional(),
  floorPlanUrl: z.string().url().nullable().optional(),
});

export const PATCH = apiHandler(
  { paramsSchema, bodySchema: patchSchema },
  async ({ params, body }) => {
    const ctx = await requirePermission("inventory.manage");
    const f = await updateFloor({
      organizationId: ctx.organization.organizationId,
      actorUserId: ctx.session.user.id,
      floorId: params.id,
      patch: body,
    });
    return { data: f };
  },
);

export const DELETE = apiHandler({ paramsSchema }, async ({ params }) => {
  const ctx = await requirePermission("inventory.manage");
  await deleteFloor({
    organizationId: ctx.organization.organizationId,
    actorUserId: ctx.session.user.id,
    floorId: params.id,
  });
  return { data: { ok: true } };
});
