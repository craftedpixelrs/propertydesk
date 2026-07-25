import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { requirePermission } from "@/server/permissions/require";
import { rejectReservation } from "@/server/services/reservations.service";

const paramsSchema = z.object({ id: z.string().min(1) });

const bodySchema = z.object({
  reason: z.string().max(500).optional(),
  expectedVersion: z.number().int().min(0).optional(),
});

export const POST = apiHandler({ paramsSchema, bodySchema }, async ({ params, body }) => {
  const ctx = await requirePermission("reservation.approve");
  const result = await rejectReservation({
    organizationId: ctx.organization.organizationId,
    actorUserId: ctx.session.user.id,
    reservationId: params.id,
    reason: body.reason,
    expectedVersion: body.expectedVersion,
  });
  return { data: result };
});
