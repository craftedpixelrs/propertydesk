import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { requirePermission } from "@/server/permissions/require";
import { createAgencyReservation } from "@/server/services/agencies/offer.service";
import { enforceRateLimit } from "@/server/rate-limit/enforce";
import { DomainErrors } from "@/lib/errors";

const bodySchema = z.object({
  unitId: z.string().min(1),
  buyerId: z.string().min(1),
  reservationAmount: z.number().nonnegative().optional(),
  currency: z.string().length(3).optional(),
  notes: z.string().max(2000).optional(),
});

export const POST = apiHandler({ bodySchema }, async ({ req, body }) => {
  const ctx = await requirePermission("reservation.create");
  if (ctx.organization.organizationType !== "AGENCY") {
    throw DomainErrors.forbidden("Ovaj portal je namenjen agencijskim organizacijama.");
  }
  enforceRateLimit({
    req,
    scope: "agency.reservation.create",
    callerId: ctx.session.user.id,
    options: { max: 10, windowMs: 60_000 },
  });
  const reservation = await createAgencyReservation({
    agencyOrganizationId: ctx.organization.organizationId,
    actorUserId: ctx.session.user.id,
    unitId: body.unitId,
    buyerId: body.buyerId,
    reservationAmount: body.reservationAmount ?? null,
    currency: body.currency,
    notes: body.notes ?? null,
  });
  return { data: reservation, status: 201 };
});

/**
 * @swagger
 * /api/v1/agency/reservations:
 *   post:
 *     tags:
 *       - agency
 *     summary: Create agency
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             additionalProperties: true
 *     responses:
 *       "200":
 *         description: OK
 *       "401":
 *         $ref: "#/components/responses/Unauthenticated"
 *       "403":
 *         $ref: "#/components/responses/Forbidden"
 */
