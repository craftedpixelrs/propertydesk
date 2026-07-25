import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { requirePermission } from "@/server/permissions/require";
import { getReservationById } from "@/server/services/reservations.service";

const paramsSchema = z.object({ id: z.string().min(1) });

export const GET = apiHandler({ paramsSchema }, async ({ params }) => {
  const ctx = await requirePermission("reservation.read");
  const reservation = await getReservationById(ctx.organization.organizationId, params.id);
  return { data: reservation };
});
