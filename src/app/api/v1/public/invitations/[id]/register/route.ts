import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { enforceRateLimit } from "@/server/rate-limit/enforce";
import { registerFromInvitation } from "@/server/services/organization-admin.service";

const paramsSchema = z.object({
  id: z.string().min(1).max(64),
});

const agencyProfileSchema = z.object({
  displayName: z.string().min(2).max(200),
  legalName: z.string().min(2).max(200),
  address: z.string().min(2).max(300),
  city: z.string().min(2).max(120),
  phone: z.string().min(5).max(40),
  email: z.string().email().optional(),
});

const bodySchema = z.object({
  name: z.string().min(2).max(120),
  password: z.string().min(10).max(128),
  agencyProfile: agencyProfileSchema.optional(),
});

/**
 * POST /api/v1/public/invitations/[id]/register
 *
 * Creates a verified credential account for the invited email, then
 * accepts the invitation. The client signs in afterwards.
 */
export const POST = apiHandler(
  { paramsSchema, bodySchema },
  async ({ req, params, body }) => {
    enforceRateLimit({
      req,
      scope: "public.invitation.register",
      callerId: params.id,
      options: { windowMs: 10 * 60_000, max: 8 },
    });

    const result = await registerFromInvitation({
      invitationId: params.id,
      name: body.name,
      password: body.password,
      agencyProfile: body.agencyProfile,
    });
    return { data: result, status: 201 };
  },
);

/**
 * @swagger
 * /api/v1/public/invitations/{id}/register:
 *   post:
 *     tags:
 *       - public
 *     summary: Registracija preko poziva u organizaciju
 *     description: |
 *       **Auth:** `javno + rate-limit (bez sesije)`
 *       Kreira nalog za email iz poziva (potvrđen jer je link tajni).
 *       Klijent potom prijavljuje korisnika i prihvata poziv.
 *     security: []
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
 *             required: [name, password]
 *             properties:
 *               name:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       "201":
 *         description: Created
 *       "409":
 *         $ref: "#/components/responses/Conflict"
 */
