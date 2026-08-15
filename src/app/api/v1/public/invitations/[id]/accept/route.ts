import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { enforceRateLimit } from "@/server/rate-limit/enforce";
import { requireSession } from "@/server/auth/session";
import { acceptPendingInvitation } from "@/server/services/organization-admin.service";

const paramsSchema = z.object({
  id: z.string().min(1).max(64),
});

/**
 * POST /api/v1/public/invitations/[id]/accept
 *
 * Logged-in user whose email matches the invitation joins the org.
 */
export const POST = apiHandler({ paramsSchema }, async ({ req, params }) => {
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
