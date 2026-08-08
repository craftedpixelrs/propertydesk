import { apiHandler } from "@/lib/api/handler";
import { getActiveOrganization, requireSession, isSuperAdmin } from "@/server/auth/session";

/**
 * Returns the current session's user, active organization context, and
 * whether the caller has the platform SUPER_ADMIN role.
 *
 * Used by the web dashboard shell to render navigation appropriate to
 * the caller's org type and permission set.
 */
export const GET = apiHandler({}, async () => {
  const session = await requireSession();
  const activeOrg = await getActiveOrganization(session);

  return {
    data: {
      user: {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        emailVerified: session.user.emailVerified,
        image: session.user.image ?? null,
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
