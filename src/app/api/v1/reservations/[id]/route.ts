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

/**
 * @swagger
 * /api/v1/reservations/{id}:
 *   get:
 *     tags:
 *       - reservations
 *     summary: List / read reservations
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       "200":
 *         description: OK
 *       "401":
 *         $ref: "#/components/responses/Unauthenticated"
 *       "403":
 *         $ref: "#/components/responses/Forbidden"
 */
