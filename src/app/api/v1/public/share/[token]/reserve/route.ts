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

/**
 * @swagger
 * /api/v1/public/share/{token}/reserve:
 *   post:
 *     tags:
 *       - public
 *     summary: Online rezervacija preko javnog share linka
 *     description: |
 *       **Auth:** `javno + rate-limit (bez sesije)`
 *       Faza 8.1 (A2). Javni endpoint — bez autentikacije.
 *
 *       Kupac dolazi na `/p/[token]` (javna stranica jedinice), popunjava
 *       formu za rezervaciju i ovaj endpoint:
 *       1. Validira unos (Zod).
 *       2. Proverava da jedinica nije već `RESERVED` (atomically, `UPDATE ... WHERE status = 'AVAILABLE'`).
 *       3. Kreira `ReservationRequest` (status `PENDING`).
 *       4. Generiše IPS QR za kaparu (ako investitor ima IBAN).
 *       5. Šalje email kupcu sa QR PNG-om i rokom od 48h.
 *       6. Šalje notifikaciju svim prodavcima investitora.
 *
 *       Rate limit: **5 pokušaja / 10 min po IP+token** i **20 pokušaja / sat po tokenu**.
 *     security: []
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *           minLength: 1
 *           maxLength: 128
 *         description: 192-bit share token (`crypto.randomBytes(24)` → base64url).
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [firstName, lastName, email, phone, depositAmount]
 *             properties:
 *               firstName: { type: string, minLength: 1, maxLength: 80, example: "Petar" }
 *               lastName: { type: string, minLength: 1, maxLength: 80, example: "Petrović" }
 *               email: { type: string, format: email, maxLength: 320, example: "petar@example.com" }
 *               phone: { type: string, minLength: 4, maxLength: 40, example: "+381641234567" }
 *               depositAmount:
 *                 type: number
 *                 exclusiveMinimum: 0
 *                 maximum: 10000000
 *                 description: "Kapara u EUR ili RSD (zavisi od jedinice). Primer: 5000."
 *                 example: 5000
 *               notes: { type: string, maxLength: 500, nullable: true, example: "Zainteresovan sam za termin gledanja vikendom." }
 *               referralCode: { type: string, maxLength: 32, nullable: true, description: "Referral kod agencije (sa `?ref=`)." }
 *     responses:
 *       "201":
 *         description: Rezervacija je primljena. Vraća ID zahteva i putanju do QR koda.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     id: { type: string }
 *                     qrUrl: { type: string, nullable: true, description: "Ako investitor nema IBAN — null." }
 *                     expiresAt: { type: string, format: date-time, description: "+48h od kreiranja" }
 *       "404":
 *         $ref: "#/components/responses/NotFound"
 *       "409":
 *         description: Jedinica više nije dostupna (u međuvremenu rezervisana od strane drugog kupca).
 *         content:
 *           application/json:
 *             schema: { $ref: "#/components/schemas/Error" }
 *             example:
 *               error:
 *                 code: CONFLICT
 *                 message: "Nažalost, ova jedinica je upravo rezervisana."
 *                 requestId: "f1d2a5f2-0e4a-4b13-8a51-96ecffec5d51"
 *       "422":
 *         $ref: "#/components/responses/ValidationFailed"
 *       "429":
 *         $ref: "#/components/responses/RateLimited"
 */
