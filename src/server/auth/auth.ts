import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { admin, organization } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";

import { prisma } from "@/server/db/prisma";
import { serverEnv } from "@/lib/env";
import {
  passwordResetEmail,
  sendEmail,
  verificationEmail,
  invitationEmail,
  changeEmailConfirmationEmail,
} from "@/server/auth/email";
import { ac } from "@/server/permissions/access-control";
import {
  organizationRoles,
  platformRoles,
} from "@/server/permissions/roles";

/**
 * Better Auth configuration.
 *
 * Key choices:
 *   - Prisma adapter, PostgreSQL provider.
 *   - Email + password (with verification and forgot/reset).
 *   - Reset flow does NOT reveal whether an email exists (Better Auth's
 *     default). We rely on that behavior and never expose account-existence
 *     signals in our own routes either.
 *   - Rate limiting is enabled and can be toggled via env for local dev.
 *   - `organization` plugin — one org == one tenant.
 *   - `admin` plugin — SUPER_ADMIN role + impersonation.
 *   - Both plugins share the same `ac` (access control) instance so
 *     permission checks work identically in either context.
 */

export const auth = betterAuth({
  appName: serverEnv.APP_NAME,
  baseURL: serverEnv.BETTER_AUTH_URL,
  secret: serverEnv.BETTER_AUTH_SECRET,

  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),

  trustedOrigins: [serverEnv.BETTER_AUTH_URL],

  emailAndPassword: {
    enabled: true,
    autoSignIn: false,
    minPasswordLength: 10,
    maxPasswordLength: 128,
    requireEmailVerification: true,
    sendResetPassword: async ({ user, url }) => {
      const msg = passwordResetEmail(url);
      await sendEmail({ ...msg, to: user.email });
    },
  },

  user: {
    changeEmail: {
      enabled: true,
      sendChangeEmailConfirmation: async ({ user, newEmail, url }) => {
        const msg = changeEmailConfirmationEmail(url, newEmail);
        await sendEmail({ ...msg, to: user.email });
      },
    },
  },

  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      const msg = verificationEmail(url);
      await sendEmail({ ...msg, to: user.email });
    },
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    expiresIn: 60 * 60 * 24, // 24h
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // refresh once per day
    cookieCache: {
      enabled: true,
      // Keep this short: the cached snapshot is served in place of a DB
      // read for tenant context / active org, so long TTLs make role or
      // active-org changes take a while to propagate. 30s strikes a
      // reasonable balance between DB pressure and freshness.
      maxAge: 30,
    },
  },

  advanced: {
    useSecureCookies: process.env.NODE_ENV === "production",
    cookiePrefix: "propertydesk",
  },

  rateLimit: {
    enabled: serverEnv.RATE_LIMIT_ENABLED,
    window: 60,
    max: 100,
  },

  databaseHooks: {
    session: {
      create: {
        // Auto-populate `activeOrganizationId` when a session is created so
        // that users with exactly one membership don't get stuck on the
        // "Nemate izabranu organizaciju" empty state right after login.
        //
        // For impersonation sessions (`impersonatedBy` set), we pick the
        // active org from the *target* user's memberships so the SUPER_ADMIN
        // lands directly inside the target's tenant context.
        //
        // SUPER_ADMIN users signing in normally have no membership → stays
        // `null` and they land on /administracija.
        async before(session) {
          const s = session as {
            userId: string;
            impersonatedBy?: string | null;
            activeOrganizationId?: string | null;
          };
          if (!s.impersonatedBy) {
            const lock = await prisma.user.findUnique({
              where: { id: s.userId },
              select: { loginLockLevel: true, loginLockedUntil: true },
            });
            if (
              lock &&
              (lock.loginLockLevel >= 6 ||
                (lock.loginLockedUntil &&
                  lock.loginLockedUntil.getTime() > Date.now()))
            ) {
              throw new Error("LOGIN_LOCKED");
            }
          }
          if (s.activeOrganizationId) return;
          const member = await prisma.member.findFirst({
            where: { userId: s.userId },
            orderBy: { createdAt: "asc" },
            select: { organizationId: true },
          });
          if (!member) return;
          return {
            data: {
              ...session,
              activeOrganizationId: member.organizationId,
            },
          };
        },
        // Whenever a new session is minted with `impersonatedBy` set (i.e.
        // Better Auth's admin plugin just started an impersonation) we write
        // a first-class audit event. Subsequent tenant mutations already
        // carry the same `impersonatedBy` on their audit rows.
        async after(session) {
          const s = session as {
            userId: string;
            impersonatedBy?: string | null;
            activeOrganizationId?: string | null;
            ipAddress?: string | null;
            userAgent?: string | null;
          };
          if (!s.impersonatedBy) return;
          const { recordAudit } = await import("@/server/audit/audit");
          const target = await prisma.user.findUnique({
            where: { id: s.userId },
            select: { email: true, name: true },
          });
          await recordAudit({
            action: "platform.impersonation_started",
            entityType: "User",
            entityId: s.userId,
            actorUserId: s.impersonatedBy,
            impersonatedByUserId: s.impersonatedBy,
            organizationId: s.activeOrganizationId ?? null,
            metadata: {
              targetEmail: target?.email ?? null,
              targetName: target?.name ?? null,
            },
            ipAddress: s.ipAddress ?? null,
            userAgent: s.userAgent ?? null,
          });
        },
      },
    },
  },

  plugins: [
    organization({
      ac,
      roles: organizationRoles,
      allowUserToCreateOrganization: false, // organizations are provisioned by SUPER_ADMIN in V1
      organizationLimit: 5,
      sendInvitationEmail: async ({ email, organization: org, invitation }) => {
        const url = `${serverEnv.BETTER_AUTH_URL}/accept-invitation/${invitation.id}`;
        const msg = invitationEmail(org.name, url);
        await sendEmail({ ...msg, to: email });
      },
    }),
    admin({
      ac,
      roles: platformRoles,
      defaultRole: "user", // ignored — we only mark specific users as SUPER_ADMIN
      adminRoles: ["SUPER_ADMIN"],
      impersonationSessionDuration: 60 * 60, // 1h
    }),
    nextCookies(), // must remain last per Better Auth docs
  ],
});

export type AppAuth = typeof auth;
