import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { requirePermission } from "@/server/permissions/require";
import { confirmReservationRequest } from "@/server/services/reservations/reservation-requests.service";

const paramsSchema = z.object({ id: z.string().min(1).max(64) });
const bodySchema = z.object({
  buyerNotes: z.string().max(2000).optional().nullable(),
});

/**
 * POST /api/v1/reservation-requests/[id]/confirm — Faza 8.1 (A2).
 * Investor confirms the deposit landed. Materialises a `Buyer` and
 * an `APPROVED` `Reservation` (attributing agency via referralCode).
 */
export const POST = apiHandler(
  { paramsSchema, bodySchema },
  async ({ params, body }) => {
    const ctx = await requirePermission("reservation.approve");
    const result = await confirmReservationRequest({
      organizationId: ctx.organization.organizationId,
      actorUserId: ctx.session.user.id,
      requestId: params.id,
      buyerNotes: body.buyerNotes ?? null,
    });
    return { data: result };
  },
);

/**
 * @swagger
 * /api/v1/reservation-requests/{id}/confirm:
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
