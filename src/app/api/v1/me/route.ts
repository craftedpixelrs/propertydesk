import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { getActiveOrganization, requireSession, isSuperAdmin } from "@/server/auth/session";
import { prisma } from "@/server/db/prisma";
import { cookies } from "next/headers";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  LOCALE_COOKIE_MAX_AGE,
  parseLocale,
} from "@/lib/i18n";

/**
 * Returns the current session's user, active organization context, and
 * whether the caller has the platform SUPER_ADMIN role.
 *
 * Used by the web dashboard shell to render navigation appropriate to
 * the caller's org type and permission set.
 */
const patchBodySchema = z
  .object({
    locale: z.enum(["sr-Latn", "en"]).optional(),
    name: z.string().min(2).max(80).optional(),
  })
  .refine((body) => body.locale !== undefined || body.name !== undefined, {
    message: "Potrebno je bar jedno polje.",
  });

export const GET = apiHandler({}, async () => {
  const session = await requireSession();
  const [activeOrg, userRow] = await Promise.all([
    getActiveOrganization(session),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { locale: true },
    }),
  ]);

  return {
    data: {
      user: {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        emailVerified: session.user.emailVerified,
        image: session.user.image ?? null,
        locale: parseLocale(userRow?.locale) ?? DEFAULT_LOCALE,
      },
      session: {
        expiresAt: session.session.expiresAt,
        impersonatedBy:
          (session.session as { impersonatedBy?: string | null }).impersonatedBy ?? null,
      },
      platform: {
        isSuperAdmin: isSuperAdmin(session),
      },
      activeOrganization: activeOrg,
    },
  };
});

export const PATCH = apiHandler({ bodySchema: patchBodySchema }, async ({ body }) => {
  const session = await requireSession();
  const data: { locale?: string; name?: string } = {};
  if (body.locale) {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { locale: body.locale },
    });
    const jar = await cookies();
    jar.set(LOCALE_COOKIE, body.locale, {
      path: "/",
      maxAge: LOCALE_COOKIE_MAX_AGE,
      sameSite: "lax",
    });
    data.locale = body.locale;
  }
  if (body.name !== undefined) {
    const { updateOwnName } = await import("@/server/services/account.service");
    const updated = await updateOwnName({ session, name: body.name });
    data.name = updated.name;
  }
  return { data };
});

/**
 * @swagger
 * /api/v1/me:
 *   patch:
 *     tags:
 *       - me
 *     summary: Update current user preferences
 *     description: |
 *       **Auth:** sesija. `locale` i/ili `name`.
 *     responses:
 *       "200":
 *         description: OK
 *       "401":
 *         $ref: "#/components/responses/Unauthenticated"
 *   get:
 *     tags:
 *       - me
 *     summary: List / read me
 *     description: |
 *       **Auth:** `sesija (ulogovan + aktivna org) — bez posebne permission`
 *     responses:
 *       "200":
 *         description: |

 *           OK
 *       "401":
 *         $ref: "#/components/responses/Unauthenticated"
 *       "403":
 *         $ref: "#/components/responses/Forbidden"
 */
