import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { requirePermission } from "@/server/permissions/require";
import { declineReservationRequest } from "@/server/services/reservations/reservation-requests.service";

const paramsSchema = z.object({ id: z.string().min(1).max(64) });
const bodySchema = z.object({
  reason: z.string().max(500).optional().nullable(),
});

/**
 * POST /api/v1/reservation-requests/[id]/decline — Faza 8.1 (A2).
 * Investor rejects the reservation request. Frees the unit's soft
 * hold if no other pending requests remain.
 */
export const POST = apiHandler(
  { paramsSchema, bodySchema },
  async ({ params, body }) => {
    const ctx = await requirePermission("reservation.approve");
    const result = await declineReservationRequest({
      organizationId: ctx.organization.organizationId,
      actorUserId: ctx.session.user.id,
      requestId: params.id,
      reason: body.reason ?? null,
    });
    return { data: result };
  },
);

/**
 * @swagger
 * /api/v1/reservation-requests/{id}/decline:
 *   post:
 *     tags:
 *       - reservation-requests
 *     summary: Create reservation-requests
 *     description: |
 *       **Auth:** `requirePermission("reservation.approve")`
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             additionalProperties: true
 *     responses:
 *       "200":
 *         description: |
 *           OK
 *       "401":
 *         $ref: "#/components/responses/Unauthenticated"
 *       "403":
 *         $ref: "#/components/responses/Forbidden"
 */
