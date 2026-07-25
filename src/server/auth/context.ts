import "server-only";
import type { OrganizationRole } from "@/server/permissions/roles";
import { organizationRoles } from "@/server/permissions/roles";
import type { PermissionString } from "@/server/permissions/access-control";
import { getActiveOrganization, getSession, isSuperAdmin } from "@/server/auth/session";
import {
  ALL_PERMISSIONS as ALL_PERMS,
  isPermittedWithOverrides,
  loadOverridesMap,
} from "@/server/services/permissions/role-overrides.service";

/**
 * Shape used by server components (layouts, pages) to render nav/menu items
 * with correct permission gating. Kept small so it can be safely passed
 * across the SC/CC boundary as plain JSON.
 */
export interface UserContext {
  user: {
    id: string;
    name: string;
    email: string;
    image: string | null;
  };
  session: {
    expiresAt: string;
    impersonatedBy: string | null;
  };
  isSuperAdmin: boolean;
  activeOrganization: {
    id: string;
    name: string;
    type: "INVESTOR" | "AGENCY" | null;
    role: OrganizationRole | null;
    status: "TRIAL" | "ACTIVE" | "RESTRICTED" | "SUSPENDED" | "CLOSED" | null;
  } | null;
  /** Snapshot of allowed permissions for the current caller in the active org. */
  permissions: PermissionString[];
}

const ALL_PERMISSIONS: PermissionString[] = ALL_PERMS;

async function computePermissions(
  role: OrganizationRole | null,
  isSuper: boolean,
): Promise<PermissionString[]> {
  // SUPER_ADMIN operates on the platform role's grants + overrides. That
  // way an operator can revoke individual defaults (e.g. narrow the
  // "impersonate" grant while still keeping the console open) without a
  // code change. Note: `setRolePermission` refuses to strip `platform.*`
  // from SUPER_ADMIN, so the console itself is always safe.
  const overrides = await loadOverridesMap();
  if (isSuper) {
    const allowed: PermissionString[] = [];
    for (const perm of ALL_PERMISSIONS) {
      if (isPermittedWithOverrides("SUPER_ADMIN", perm, overrides)) {
        allowed.push(perm);
      }
    }
    return allowed;
  }
  if (!role || !(role in organizationRoles)) return [];
  const allowed: PermissionString[] = [];
  for (const perm of ALL_PERMISSIONS) {
    if (perm.startsWith("platform.")) continue;
    if (isPermittedWithOverrides(role, perm, overrides)) allowed.push(perm);
  }
  return allowed;
}

export async function loadUserContext(): Promise<UserContext | null> {
  const session = await getSession();
  if (!session) return null;

  let activeOrg = null;
  try {
    activeOrg = await getActiveOrganization(session);
  } catch {
    activeOrg = null;
  }

  const superAdmin = isSuperAdmin(session);
  const permissions = await computePermissions(
    activeOrg?.organizationRole ?? null,
    superAdmin,
  );

  return {
    user: {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      image: session.user.image ?? null,
    },
    session: {
      expiresAt:
        session.session.expiresAt instanceof Date
          ? session.session.expiresAt.toISOString()
          : String(session.session.expiresAt),
      impersonatedBy:
        (session.session as { impersonatedBy?: string | null }).impersonatedBy ?? null,
    },
    isSuperAdmin: superAdmin,
    activeOrganization: activeOrg
      ? {
          id: activeOrg.organizationId,
          name: activeOrg.organizationName,
          type: activeOrg.organizationType,
          role: activeOrg.organizationRole,
          status: activeOrg.organizationStatus,
        }
      : null,
    permissions,
  };
}
