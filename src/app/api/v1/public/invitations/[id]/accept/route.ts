import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { enforceRateLimit } from "@/server/rate-limit/enforce";
import { requireSession } from "@/server/auth/session";
import { acceptPendingInvitation } from "@/server/services/organization-admin.service";

const paramsSchema = z.object({
  id: z.string().min(1).max(64),
});

const bodySchema = z
  .object({
    agencyProfile: z
      .object({
        displayName: z.string().min(2).max(200),
        legalName: z.string().min(2).max(200),
        taxNumber: z.string().min(2).max(32),
        registrationNumber: z.string().min(2).max(32),
        address: z.string().min(2).max(300),
        city: z.string().min(2).max(120),
        postalCode: z.string().min(3).max(16),
        phone: z.string().min(5).max(40),
        email: z.string().email().optional(),
      })
      .optional(),
  })
  .optional();

/**
 * POST /api/v1/public/invitations/[id]/accept
 *
 * Logged-in user whose email matches the invitation joins the org.
 */
export const POST = apiHandler(
  { paramsSchema, bodySchema },
  async ({ req, params, body }) => {
  enforceRateLimit({
    req,
    scope: "public.invitation.accept",
    callerId: params.id,
    options: { windowMs: 10 * 60_000, max: 20 },
  });

  const session = await requireSession();
  await acceptPendingInvitation({
    invitationId: params.id,
    userId: session.user.id,
    userEmail: session.user.email,
    agencyProfile: body?.agencyProfile,
  });
  return { data: { ok: true } };
});

/**
 * @swagger
 * /api/v1/public/invitations/{id}/accept:
 *   post:
 *     tags:
 *       - public
 *     summary: Prihvatanje poziva u organizaciju
 *     description: |
 *       **Auth:** `sesija (email mora da se poklapa sa pozivom)`
 *       Pozivani korisnik, već ulogovan, postaje član organizacije.
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
