import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { requireSuperAdmin } from "@/server/permissions/require";
import { updatePlatformUser } from "@/server/services/platform.service";

const paramsSchema = z.object({ id: z.string().min(1) });

const patchBody = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  email: z.string().trim().email().max(254).optional(),
  emailVerified: z.boolean().optional(),
  banned: z.boolean().optional(),
  banReason: z.string().trim().max(500).nullable().optional(),
  platformRole: z.enum(["SUPER_ADMIN"]).nullable().optional(),
  propertyDeskTeam: z
    .object({
      member: z.boolean(),
      teamRole: z
        .enum(["SETTER", "CLOSER", "OPERATIONS", "MANAGER"])
        .optional(),
      leadScope: z
        .enum(["OWN", "OWN_AND_UNASSIGNED", "TEAM", "ALL"])
        .optional(),
      enabled: z.boolean().optional(),
    })
    .optional(),
});

export const PATCH = apiHandler(
  { bodySchema: patchBody, paramsSchema },
  async ({ body, params }) => {
    const ctx = await requireSuperAdmin();
    const user = await updatePlatformUser(
      params.id,
      body,
      ctx.session.user.id,
    );
    return { data: user };
  },
);

/**
 * @swagger
 * /api/v1/platform/users/{id}:
 *   patch:
 *     tags:
 *       - platform
 *     summary: Ažuriraj nalog korisnika platforme
 *     description: |
 *       **Auth:** `requireSuperAdmin() — platform SUPER_ADMIN`
 *
 *       Menja nalog (ime, e-mail, verifikacija, ban, platformska uloga) i
 *       opciono članstvo u Property Desk internom timu (Sloj C). Aplikacione
 *       uloge unutar tenanta (Sloj B) se ne menjaju ovde.
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
 *         description: OK
 *       "401":
 *         $ref: "#/components/responses/Unauthenticated"
 *       "403":
 *         $ref: "#/components/responses/Forbidden"
 *       "409":
 *         description: E-mail je već zauzet
 */
