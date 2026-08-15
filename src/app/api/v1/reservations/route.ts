import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { paginate } from "@/lib/api/query";
import { requirePermission } from "@/server/permissions/require";
import {
  createReservation,
  listReservations,
} from "@/server/services/reservations.service";
import { enforceRateLimit } from "@/server/rate-limit/enforce";
import type { ReservationStatus } from "@prisma/client";

const RESERVATION_STATUSES = [
  "REQUESTED",
  "APPROVED",
  "REJECTED",
  "EXPIRED",
  "CANCELED",
  "CONVERTED",
] as const;

const createSchema = z.object({
  unitId: z.string().min(1),
  buyerId: z.string().min(1),
  assignedUserId: z.string().min(1).optional(),
  reservationAmount: z.number().nonnegative().optional(),
  currency: z.string().length(3).optional(),
  notes: z.string().max(2000).optional(),
});

function parseCsvList(raw: string | null): ReservationStatus[] | undefined {
  if (!raw) return undefined;
  const values = raw.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean);
  const filtered = values.filter((v): v is ReservationStatus =>
    (RESERVATION_STATUSES as readonly string[]).includes(v),
  );
  return filtered.length > 0 ? filtered : undefined;
}

export const GET = apiHandler({}, async ({ query, searchParams }) => {
  const ctx = await requirePermission("reservation.read");
  const { items, total } = await listReservations({
    organizationId: ctx.organization.organizationId,
    page: query.page,
    pageSize: query.pageSize,
    status: parseCsvList(searchParams.get("status")),
    unitId: searchParams.get("unitId") ?? undefined,
    buyerId: searchParams.get("buyerId") ?? undefined,
    projectId: searchParams.get("projectId") ?? undefined,
  });
  const { items: pageItems, pagination } = paginate(items, query.page, query.pageSize, total);
  return { data: pageItems, meta: { pagination } };
});

export const POST = apiHandler({ bodySchema: createSchema }, async ({ req, body }) => {
  const ctx = await requirePermission("reservation.create");
  enforceRateLimit({
    req,
    scope: "reservation.create",
    callerId: ctx.session.user.id,
    options: { max: 10, windowMs: 60_000 },
  });
  const reservation = await createReservation({
    organizationId: ctx.organization.organizationId,
    actorUserId: ctx.session.user.id,
    unitId: body.unitId,
    buyerId: body.buyerId,
    assignedUserId: body.assignedUserId,
    reservationAmount: body.reservationAmount ?? null,
    currency: body.currency,
    notes: body.notes ?? null,
    sourceType: "INTERNAL",
  });
  return { data: reservation, status: 201 };
});

/**
 * @swagger
 * /api/v1/reservations:
 *   get:
 *     tags:
 *       - reservations
 *     summary: List / read reservations
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
 *   post:
 *     tags:
 *       - reservations
 *     summary: Create reservations
 *     description: |
 *       **Auth:** `requirePermission("reservation.create") + requirePermission("reservation.read")`
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
