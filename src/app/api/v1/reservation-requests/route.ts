import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { requirePermission } from "@/server/permissions/require";
import {
  expireStaleReservationRequests,
  listReservationRequests,
} from "@/server/services/reservations/reservation-requests.service";

const statusSchema = z.enum([
  "PENDING",
  "CONFIRMED",
  "DECLINED",
  "EXPIRED",
  "ALL",
]);

/**
 * GET /api/v1/reservation-requests — Faza 8.1 (A2).
 * Investor-facing list of public reservation requests. Opportunistically
 * expires stale PENDING rows so the counter stays honest.
 */
export const GET = apiHandler({}, async ({ searchParams }) => {
  const ctx = await requirePermission("reservation.read");
  await expireStaleReservationRequests();
  const statusParam = searchParams.get("status");
  const status = statusParam ? statusSchema.parse(statusParam) : undefined;
  const page = Number(searchParams.get("page") ?? "1");
  const pageSize = Number(searchParams.get("pageSize") ?? "25");
  const result = await listReservationRequests({
    organizationId: ctx.organization.organizationId,
    status,
    page,
    pageSize,
  });
  return { data: result };
});

/**
 * @swagger
 * /api/v1/reservation-requests:
 *   get:
 *     tags:
 *       - reservation-requests
 *     summary: List / read reservation-requests
 *     description: |
 *       **Auth:** `requirePermission("reservation.read")`
 *     responses:
 *       "200":
 *         description: |
 *           OK
 *       "401":
 *         $ref: "#/components/responses/Unauthenticated"
 *       "403":
 *         $ref: "#/components/responses/Forbidden"
 */
