import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { requirePermission } from "@/server/permissions/require";
import { approveReservation } from "@/server/services/reservations.service";

const paramsSchema = z.object({ id: z.string().min(1) });

const bodySchema = z.object({
  holdDays: z.number().int().min(1).max(365).optional(),
  expectedVersion: z.number().int().min(0).optional(),
});

export const POST = apiHandler({ paramsSchema, bodySchema }, async ({ params, body }) => {
  const ctx = await requirePermission("reservation.approve");
  const result = await approveReservation({
    organizationId: ctx.organization.organizationId,
    actorUserId: ctx.session.user.id,
    reservationId: params.id,
    holdDays: body.holdDays,
    expectedVersion: body.expectedVersion,
  });
  return { data: result };
});
