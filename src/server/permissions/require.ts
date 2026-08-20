import {
  AuthError,
  getActiveOrganization,
  isSuperAdmin,
  requireSession,
  type ActiveOrganizationContext,
  type AppSession,
} from "@/server/auth/session";
import {
  organizationRoles,
  type OrganizationRole,
} from "@/server/permissions/roles";
import { type PermissionString } from "@/server/permissions/access-control";
import { checkPermissionForRole } from "@/server/services/permissions/role-overrides.service";
import {
  isAgencyOrgSetupComplete,
  isInvestorOrgSetupComplete,
} from "@/server/services/organization-admin.service";
import { getRestrictedModeAllowlist } from "@/server/permissions/restricted-mode";

/**
 * Deny-by-default authorization primitives.
 *
 * These helpers are the ONLY place in the codebase that decides whether an
 * action is allowed. Route handlers and services must call one of them
 * before performing any tenant-owned read or mutation. Never inspect
 * `member.role` or `user.role` directly outside this module.
 */

export interface AuthorizedContext {
  session: AppSession;
  organization: ActiveOrganizationContext;
  isSuperAdmin: boolean;
}

export interface PlatformAuthorizedContext {
  session: AppSession;
  isSuperAdmin: true;
}

async function checkOrgRolePermission(
  role: OrganizationRole,
  permission: PermissionString,
): Promise<boolean> {
  if (!(role in organizationRoles)) return false;
  // Consult the override layer first — a SUPER_ADMIN may have granted or
  // revoked this specific `(role, permission)` pair via
  // `/administracija/role`. When no override row exists, the check falls
  // through to the compile-time default declared in `roles.ts`.
  return checkPermissionForRole(role, permission);
}

async function checkPlatformRolePermission(
  permission: PermissionString,
): Promise<boolean> {
  // Platform permissions live on the SUPER_ADMIN role. We reuse the
  // override-aware checker so an operator could, in theory, narrow one of
  // the platform grants (though `setRolePermission` refuses to strip
  // `platform.*` from SUPER_ADMIN to keep the console reachable).
  return checkPermissionForRole("SUPER_ADMIN", permission);
}

/**
 * Require a given permission for the caller in their currently active
 * organization. Grants access when either:
 *   - the caller is a SUPER_ADMIN (org context still resolved for scoping), or
 *   - the caller's organization role permits the requested permission.
 *
 * Always throws `AuthError("FORBIDDEN")` on denial.
 */
export async function requirePermission(
  permission: PermissionString,
): Promise<AuthorizedContext> {
  const session = await requireSession();
  const superAdmin = isSuperAdmin(session);

  const org = await getActiveOrganization(session);
  if (!org) {
    throw new AuthError(
      "NO_ACTIVE_ORGANIZATION",
      "Molimo izaberite aktivnu organizaciju.",
    );
  }

  // Enforce RESTRICTED mode: block anything not on the explicit allowlist.
  // SUPER_ADMIN is exempt so support can act on the tenant while it's frozen.
  if (
    org.organizationStatus === "RESTRICTED" &&
    !superAdmin &&
    org.organizationType !== "AGENCY"
  ) {
    const allowlist = await getRestrictedModeAllowlist();
    if (!allowlist.has(permission)) {
      throw new AuthError(
        "ORGANIZATION_RESTRICTED",
        "Pristup je privremeno ograničen zbog neizmirenih obaveza. Molimo izmirite fakturu da biste nastavili sa radom.",
      );
    }
  }

  if (superAdmin) {
    return { session, organization: org, isSuperAdmin: true };
  }

  if (
    org.organizationType === "INVESTOR" &&
    permission !== "organization.read" &&
    permission !== "organization.manage"
  ) {
    const setupDone = await isInvestorOrgSetupComplete(org.organizationId);
    if (!setupDone) {
      throw new AuthError(
        "FORBIDDEN",
        "Organizacija još nije podešena. Vlasnik mora da popuni podatke firme pre korišćenja aplikacije.",
      );
    }
  }

  if (
    org.organizationType === "AGENCY" &&
    permission !== "organization.read" &&
    permission !== "organization.manage"
  ) {
    const setupDone = await isAgencyOrgSetupComplete(org.organizationId);
    if (!setupDone) {
      throw new AuthError(
        "FORBIDDEN",
        "Prvo popunite podatke agencije da biste koristili portal.",
      );
    }
  }

  if (!(await checkOrgRolePermission(org.organizationRole, permission))) {
    throw new AuthError("FORBIDDEN", "Nemate ovlašćenje za ovu radnju.");
  }

  return { session, organization: org, isSuperAdmin: false };
}

/**
 * Assert the caller has SUPER_ADMIN role. Used by platform-admin routes.
 */
export async function requireSuperAdmin(): Promise<PlatformAuthorizedContext> {
  const session = await requireSession();
  if (!isSuperAdmin(session)) {
    throw new AuthError(
      "PLATFORM_ADMIN_REQUIRED",
      "Ovoj operaciji može pristupiti samo administrator platforme.",
    );
  }
  return { session, isSuperAdmin: true };
}

/**
 * Require a platform-scoped permission (i.e. `platform.*`). Only SUPER_ADMIN
 * users can pass this check. Does NOT require an active organization.
 */
export async function requirePlatformPermission(
  permission: PermissionString,
): Promise<PlatformAuthorizedContext> {
  const ctx = await requireSuperAdmin();
  if (!(await checkPlatformRolePermission(permission))) {
    throw new AuthError("FORBIDDEN", "Nemate ovlašćenje za ovu radnju.");
  }
  return ctx;
}

/**
 * Assert the caller is a member of a specific organization. Useful when
 * pre-loading data outside a permission-guarded route (e.g. resolving a
 * document owner). Throws on mismatch.
 */
export function assertOrgMembership(
  ctx: AuthorizedContext,
  organizationId: string,
): void {
  if (ctx.isSuperAdmin) return;
  if (ctx.organization.organizationId !== organizationId) {
    throw new AuthError(
      "ORGANIZATION_ACCESS_DENIED",
      "Podatak ne pripada Vašoj organizaciji.",
    );
  }
}
