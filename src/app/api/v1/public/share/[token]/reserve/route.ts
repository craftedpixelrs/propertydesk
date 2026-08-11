import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { enforceRateLimit } from "@/server/rate-limit/enforce";
import { createReservationRequest } from "@/server/services/reservations/reservation-requests.service";

const paramsSchema = z.object({
  token: z.string().min(1).max(128),
});

const bodySchema = z.object({
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(80),
  email: z.string().email().max(320),
  phone: z.string().min(4).max(40),
  depositAmount: z.number().positive().max(10_000_000),
  notes: z.string().max(500).optional().nullable(),
  referralCode: z.string().max(32).optional().nullable(),
});

/**
 * POST /api/v1/public/share/[token]/reserve — Faza 8.1 (A2).
 *
 * Public, unauthenticated endpoint. Consumers land on `/p/[token]`
 * (a share-link offer page), fill in the reservation form, and this
 * route creates a PENDING `ReservationRequest` + pre-renders the
 * IPS QR (when applicable) so the buyer can pay the deposit.
 *
 * Rate-limited per IP AND per token to avoid enumeration + noise.
 */
export const POST = apiHandler(
  { paramsSchema, bodySchema },
  async ({ req, params, body }) => {
    // 5 attempts / 10 min per IP × token, plus a 20 attempts / hour
    // per token bucket to absorb NAT-shared IPs.
    enforceRateLimit({
      req,
      scope: "public.reserve.ip",
      options: { windowMs: 10 * 60_000, max: 5 },
    });
    enforceRateLimit({
      req,
      scope: "public.reserve.token",
      callerId: params.token,
      options: { windowMs: 60 * 60_000, max: 20 },
    });

    const result = await createReservationRequest({
      token: params.token,
      firstName: body.firstName,
      lastName: body.lastName,
      email: body.email,
      phone: body.phone,
      depositAmount: body.depositAmount,
      notes: body.notes ?? null,
      referralCode: body.referralCode ?? null,
    });

    return {
      data: {
        id: result.id,
        ipsReference: result.ipsReference,
        ipsQrAvailable: result.ipsQrAvailable,
        expiresAt: result.expiresAt.toISOString(),
      },
      status: 201,
    };
  },
);
