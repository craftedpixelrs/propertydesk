import "server-only";
import type { PropertyDeskLeadScope, PropertyDeskTeamRole } from "@prisma/client";
import type { OrganizationRole } from "@/server/permissions/roles";
import { organizationRoles } from "@/server/permissions/roles";
import type { PermissionString } from "@/server/permissions/access-control";
import { prisma } from "@/server/db/prisma";
import { DEFAULT_LOCALE, parseLocale, type Locale } from "@/lib/i18n";
import { getActiveOrganization, getSession, isSuperAdmin } from "@/server/auth/session";
import { getPropertyDeskTeamMember } from "@/server/permissions/property-desk";
import {
  ALL_PERMISSIONS as ALL_PERMS,
  isPermittedWithOverrides,
  loadOverridesMap,
} from "@/server/services/permissions/role-overrides.service";
import {
  filterPermissionsForRestrictedMode,
  getRestrictedModeAllowlist,
} from "@/server/permissions/restricted-mode";

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
    locale: Locale;
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
  /**
   * Property Desk internal-team membership. `null` for regular users and
   * for a bare SUPER_ADMIN who wasn't explicitly added to the team.
   * SUPER_ADMIN nonetheless has full access — see `isSuperAdmin`.
   */
  propertyDeskTeam: {
    teamRole: PropertyDeskTeamRole;
    leadScope: PropertyDeskLeadScope;
    enabled: boolean;
  } | null;
  /** Snapshot of allowed permissions for the current caller in the active org. */
  permissions: PermissionString[];
}

const ALL_PERMISSIONS: PermissionString[] = ALL_PERMS;

async function computePermissions(
  role: OrganizationRole | null,
  isSuper: boolean,
  pdTeamRole: PropertyDeskTeamRole | null,
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
  const allowed: PermissionString[] = [];
  if (role && role in organizationRoles) {
    for (const perm of ALL_PERMISSIONS) {
      if (perm.startsWith("platform.")) continue;
      if (perm.startsWith("pd_")) continue; // handled by pdTeamRole below
      if (isPermittedWithOverrides(role, perm, overrides)) allowed.push(perm);
    }
  }
  // Layer C — merge Property Desk `pd_*` grants for the caller's team role.
  // A user can be both a tenant member and a Property Desk team member; the
  // two permission surfaces are additive.
  if (pdTeamRole) {
    for (const perm of ALL_PERMISSIONS) {
      if (!perm.startsWith("pd_")) continue;
      if (isPermittedWithOverrides(pdTeamRole, perm, overrides)) {
        allowed.push(perm);
      }
    }
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

  const [pdTeam, userRow] = await Promise.all([
    getPropertyDeskTeamMember(session.user.id).catch(() => null),
    prisma.user
      .findUnique({
        where: { id: session.user.id },
        select: { locale: true },
      })
      .catch(() => null),
  ]);
  const locale = parseLocale(userRow?.locale) ?? DEFAULT_LOCALE;

  let permissions = await computePermissions(
    activeOrg?.organizationRole ?? null,
    superAdmin,
    pdTeam?.enabled ? pdTeam.teamRole : null,
  );
  if (
    !superAdmin &&
    activeOrg?.organizationStatus === "RESTRICTED" &&
    activeOrg.organizationType !== "AGENCY"
  ) {
    const allowlist = await getRestrictedModeAllowlist();
    permissions = filterPermissionsForRestrictedMode(permissions, allowlist);
  }

  return {
    user: {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      image: session.user.image ?? null,
      locale,
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
    propertyDeskTeam: pdTeam
      ? {
          teamRole: pdTeam.teamRole,
          leadScope: pdTeam.leadScope,
          enabled: pdTeam.enabled,
        }
      : null,
    permissions,
  };
}
