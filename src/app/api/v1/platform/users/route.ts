import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { requireSuperAdmin } from "@/server/permissions/require";
import { createPlatformUser } from "@/server/services/platform.service";
import { ALL_ORG_ROLE_NAMES } from "@/server/permissions/roles";

const createBody = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(254),
  password: z.string().min(10).max(128).optional(),
  emailVerified: z.boolean().optional(),
  platformRole: z.enum(["SUPER_ADMIN"]).nullable().optional(),
  organizationId: z.string().min(1).nullable().optional(),
  organizationRole: z
    .enum(ALL_ORG_ROLE_NAMES as [string, ...string[]])
    .optional(),
  propertyDeskTeam: z
    .object({
      teamRole: z.enum(["SETTER", "CLOSER", "OPERATIONS", "MANAGER"]),
      leadScope: z
        .enum(["OWN", "OWN_AND_UNASSIGNED", "TEAM", "ALL"])
        .optional(),
    })
    .nullable()
    .optional(),
});

export const POST = apiHandler({ bodySchema: createBody }, async ({ body }) => {
  const ctx = await requireSuperAdmin();
    const user = await createPlatformUser(
      {
        ...body,
        organizationRole: body.organizationRole as
          | (typeof ALL_ORG_ROLE_NAMES)[number]
          | undefined,
      },
      ctx.session.user.id,
    );
  return { data: user, status: 201 };
});

/**
 * @swagger
 * /api/v1/platform/users:
 *   post:
 *     tags:
 *       - platform
 *     summary: Kreiraj nalog i dodeli ga organizaciji i/ili Property Desk timu
 *     description: |
 *       **Auth:** `requireSuperAdmin() — platform SUPER_ADMIN`
 *
 *       Ako nalog sa tim e-mailom već postoji, dodaje se u izabranu
 *       organizaciju / Property Desk tim umesto da se pravi duplikat.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             additionalProperties: true
 *     responses:
 *       "201":
 *         description: Kreirano
 *       "401":
 *         $ref: "#/components/responses/Unauthenticated"
 *       "403":
 *         $ref: "#/components/responses/Forbidden"
 *       "409":
 *         description: Korisnik je već član
 */
