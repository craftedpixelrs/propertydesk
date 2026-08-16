import { headers } from "next/headers";
import { auth } from "@/server/auth/auth";
import { prisma } from "@/server/db/prisma";
import type { OrganizationRole, PlatformRole } from "@/server/permissions/roles";
import {
  expiryReasonForSubscription,
  syncExpiredAccess,
} from "@/server/services/subscriptions/expire.service";

/**
 * Session utilities used by the API layer and server components.
 *
 * IMPORTANT: never accept an `organizationId` blindly from the client.
 * The only source of truth for "which organization is the caller acting
 * in" is the Better Auth session's `activeOrganizationId` (managed via
 * `authClient.organization.setActive`), cross-checked against the
 * `member` table.
 */

export type AppSession = NonNullable<
  Awaited<ReturnType<typeof auth.api.getSession>>
>;

export type OrganizationStatusValue =
  | "TRIAL"
  | "ACTIVE"
  | "RESTRICTED"
  | "SUSPENDED"
  | "CLOSED";

export interface ActiveOrganizationContext {
  organizationId: string;
  organizationRole: OrganizationRole;
  organizationName: string;
  organizationType: "INVESTOR" | "AGENCY" | null;
  organizationStatus: OrganizationStatusValue | null;
}

export async function getSession(): Promise<AppSession | null> {
  const hdrs = await headers();
  const session = await auth.api.getSession({ headers: hdrs });
  return session as AppSession | null;
}

export async function requireSession(): Promise<AppSession> {
  const s = await getSession();
  if (!s) {
    throw new AuthError("UNAUTHENTICATED", "Neophodna je prijava.");
  }
  return s;
}

export function getPlatformRole(session: AppSession): PlatformRole | null {
  const role = (session.user as { role?: string | null } | null)?.role;
  if (!role) return null;
  return role === "SUPER_ADMIN" ? "SUPER_ADMIN" : null;
}

export function isSuperAdmin(session: AppSession): boolean {
  return getPlatformRole(session) === "SUPER_ADMIN";
}

/**
 * Resolve the active organization strictly from the session, then verify
 * that the user is actually a member of that organization at the moment.
 *
 * Returns `null` when the session has no active organization set (e.g. a
 * SUPER_ADMIN operating outside of any tenant). Throws when the session
 * claims an organization that the user is not a valid member of.
 */
export async function getActiveOrganization(
  session: AppSession,
): Promise<ActiveOrganizationContext | null> {
  let activeOrgId = (session.session as { activeOrganizationId?: string | null })
    .activeOrganizationId;

  // Better Auth caches the session in an encrypted cookie for a short TTL.
  // If the caller was issued a session cookie BEFORE `activeOrganizationId`
  // was populated (e.g. before we added the session-create hook), the cached
  // cookie still says `null` even though the DB row now has a value.
  //
  // Recovering from the DB here means the user doesn't have to sign out and
  // back in again to see their tenant nav after a code change.
  if (!activeOrgId) {
    const dbSession = await prisma.session.findFirst({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      select: { activeOrganizationId: true },
    });
    activeOrgId = dbSession?.activeOrganizationId ?? null;
  }

  // Final fallback: if the user has a single membership and no active org
  // was set anywhere yet, pick that one. This ensures newly-invited users
  // don't get stuck on the empty state.
  if (!activeOrgId) {
    const member = await prisma.member.findFirst({
      where: { userId: session.user.id },
      orderBy: { createdAt: "asc" },
      select: { organizationId: true },
    });
    activeOrgId = member?.organizationId ?? null;
  }

  if (!activeOrgId) return null;

  const membership = await prisma.member.findFirst({
    where: {
      organizationId: activeOrgId,
      userId: session.user.id,
    },
    include: {
      organization: {
        include: {
          profile: true,
          subscription: {
            select: {
              status: true,
              trialEndsAt: true,
              endsAt: true,
              currentPeriodEnd: true,
            },
          },
        },
      },
    },
  });

  if (!membership) {
    throw new AuthError(
      "ORGANIZATION_ACCESS_DENIED",
      "Nemate pristup toj organizaciji.",
    );
  }

  let status = (membership.organization.profile?.status ?? null) as
    | OrganizationStatusValue
    | null;

  const sub = membership.organization.subscription;
  if (sub && expiryReasonForSubscription(sub, new Date())) {
    const synced = await syncExpiredAccess(membership.organizationId).catch(
      () => "RESTRICTED" as const,
    );
    status = synced ?? "RESTRICTED";
  }

  if (status === "SUSPENDED" || status === "CLOSED") {
    throw new AuthError(
      "ORGANIZATION_SUSPENDED",
      "Organizacija je trenutno suspendovana ili zatvorena.",
    );
  }
  // `RESTRICTED` is NOT thrown here — the caller still needs access to the
  // billing UI (to pay the outstanding invoice). Enforcement lives in
  // `requirePermission` against `GlobalBillingSettings.restrictedModeAllowedPermissions`.

  return {
    organizationId: membership.organizationId,
    organizationRole: membership.role as OrganizationRole,
    organizationName: membership.organization.name,
    organizationType: membership.organization.profile?.type ?? null,
    organizationStatus: status,
  };
}

export async function requireActiveOrganization(
  session: AppSession,
): Promise<ActiveOrganizationContext> {
  const ctx = await getActiveOrganization(session);
  if (!ctx) {
    throw new AuthError(
      "NO_ACTIVE_ORGANIZATION",
      "Molimo izaberite aktivnu organizaciju.",
    );
  }
  return ctx;
}

/**
 * Convenience: request session + active org in one call.
 */
export async function requireSessionAndOrg(): Promise<{
  session: AppSession;
  org: ActiveOrganizationContext;
}> {
  const session = await requireSession();
  const org = await requireActiveOrganization(session);
  return { session, org };
}

// -----------------------------------------------------------------------------
// AuthError — typed error thrown by auth/authorization helpers.
// -----------------------------------------------------------------------------

export type AuthErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "ORGANIZATION_ACCESS_DENIED"
  | "ORGANIZATION_SUSPENDED"
  | "ORGANIZATION_RESTRICTED"
  | "NO_ACTIVE_ORGANIZATION"
  | "PLATFORM_ADMIN_REQUIRED";

export class AuthError extends Error {
  readonly code: AuthErrorCode;
  constructor(code: AuthErrorCode, message: string) {
    super(message);
    this.name = "AuthError";
    this.code = code;
  }
}
