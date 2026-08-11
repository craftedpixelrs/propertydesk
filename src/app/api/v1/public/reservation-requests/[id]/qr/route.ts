import { NextResponse } from "next/server";
import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { enforceRateLimit } from "@/server/rate-limit/enforce";
import { prisma } from "@/server/db/prisma";
import { storage } from "@/server/storage";

const paramsSchema = z.object({
  id: z.string().min(1).max(64),
});

/**
 * GET /api/v1/public/reservation-requests/[id]/qr — Faza 8.1 (A2).
 *
 * Serves the pre-rendered IPS QR PNG for a `PENDING` reservation
 * request. The public confirmation page (`/rezervacija/[id]`) uses
 * this endpoint to embed the QR. No authentication because the ID
 * is a `cuid` (opaque, unguessable), the row must be PENDING, and
 * we rate-limit heavily.
 */
export const GET = apiHandler({ paramsSchema }, async ({ req, params }) => {
  enforceRateLimit({
    req,
    scope: "public.reservation.qr",
    callerId: params.id,
    options: { windowMs: 60_000, max: 60 },
  });

  const row = await prisma.reservationRequest.findUnique({
    where: { id: params.id },
    select: {
      status: true,
      ipsQrPngPath: true,
      expiresAt: true,
    },
  });
  if (!row) return new NextResponse("Not Found", { status: 404 });
  if (row.status !== "PENDING") {
    return new NextResponse("Gone", { status: 410 });
  }
  if (row.expiresAt < new Date()) {
    return new NextResponse("Gone", { status: 410 });
  }
  if (!row.ipsQrPngPath) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const buffer = await storage().read(row.ipsQrPngPath);
  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "content-type": "image/png",
      "cache-control": "private, max-age=60",
    },
  });
});
