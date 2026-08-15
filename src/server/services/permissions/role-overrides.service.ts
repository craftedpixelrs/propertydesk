import "server-only";

import { prisma } from "@/server/db/prisma";
import { recordAudit } from "@/server/audit/audit";
import { DomainErrors } from "@/lib/errors";
import {
  organizationRoles,
  platformRoles,
  propertyDeskTeamRoles,
  ALL_ORG_ROLE_NAMES,
  PROPERTY_DESK_ROLE_NAMES,
  type OrganizationRole,
  type PlatformRole,
  type PropertyDeskRole,
} from "@/server/permissions/roles";
import {
  permissionStatement,
  toPermissionRequest,
  type PermissionString,
} from "@/server/permissions/access-control";

/**
 * Role → permission override layer.
 *
 * Ships permissions ("resource.action") come from `roles.ts` (Better Auth
 * `ac.newRole({ … })`). That default is authoritative when no row exists
 * in `role_permission_override`. A SUPER_ADMIN can grant or revoke any
 * default via this service, which:
 *   - writes an upsert row with `granted=true|false`
 *   - invalidates the in-process cache so the change is picked up on the
 *     next request (both server components and API handlers)
 *   - records an audit event.
 *
 * The read path (`applyOverrides`, `checkPermissionForRole`,
 * `computeAllowedPermissionsForRole`) is used from `context.ts` and
 * `require.ts` so the whole permission surface is consistent.
 */

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export type RoleName = OrganizationRole | PlatformRole | PropertyDeskRole;

export interface RoleOverrideRow {
  role: string;
  permission: string;
  granted: boolean;
}

export interface RolePermissionCell {
  /** Compile-time default from `roles.ts`. */
  default: boolean;
  /** After applying override (if any). */
  effective: boolean;
  /** True when a row exists in `role_permission_override`. */
  hasOverride: boolean;
}

export interface RoleMatrix {
  /** Every resource.action known to the app, in stable order. */
  permissions: PermissionString[];
  /** Every role name we support, in stable order. */
  roles: RoleName[];
  /** `cells[role][permission]` for O(1) lookup. */
  cells: Record<string, Record<string, RolePermissionCell>>;
}

// -----------------------------------------------------------------------------
// Static role & permission catalog
// -----------------------------------------------------------------------------

export const ALL_ROLE_NAMES: RoleName[] = [
  ...ALL_ORG_ROLE_NAMES,
  ...(Object.keys(platformRoles) as PlatformRole[]),
  ...PROPERTY_DESK_ROLE_NAMES,
];

/** All `resource.action` strings currently declared in the statement. */
export const ALL_PERMISSIONS: PermissionString[] = (() => {
  const list: string[] = [];
  for (const [resource, actions] of Object.entries(permissionStatement)) {
    for (const action of actions) list.push(`${resource}.${action}`);
  }
  return list as PermissionString[];
})();

// -----------------------------------------------------------------------------
// Default-grant check (pure, no DB)
// -----------------------------------------------------------------------------

interface RoleAuthorize {
  authorize: (
    req: Record<string, string[]>,
    connector?: "AND" | "OR",
  ) => { success: boolean };
}

function roleDefById(role: RoleName): RoleAuthorize | null {
  if ((organizationRoles as unknown as Record<string, RoleAuthorize>)[role]) {
    return (organizationRoles as unknown as Record<string, RoleAuthorize>)[role]!;
  }
  if ((platformRoles as unknown as Record<string, RoleAuthorize>)[role]) {
    return (platformRoles as unknown as Record<string, RoleAuthorize>)[role]!;
  }
  if (
    (propertyDeskTeamRoles as unknown as Record<string, RoleAuthorize>)[role]
  ) {
    return (propertyDeskTeamRoles as unknown as Record<string, RoleAuthorize>)[
      role
    ]!;
  }
  return null;
}

export function defaultAllowsPermission(
  role: RoleName,
  permission: PermissionString,
): boolean {
  const def = roleDefById(role);
  if (!def) return false;
  // SUPER_ADMIN doesn't necessarily authorize every string via `.authorize`
  // (platform.* is granted; user.* / session.* are granted; but the
  // ac.newRole authorize call returns success only for statement pairs the
  // role explicitly received). Since roles.ts already grants what each role
  // should get, we can rely on `.authorize` uniformly for all roles.
  try {
    return Boolean(def.authorize(toPermissionRequest(permission))?.success);
  } catch {
    return false;
  }
}

// -----------------------------------------------------------------------------
// Cache (in-process, TTL + invalidation on writes)
// -----------------------------------------------------------------------------

interface CacheEntry {
  expiresAt: number;
  map: Map<string, boolean>;
}

const CACHE_TTL_MS = 10_000;
let cache: CacheEntry | null = null;

function cacheKey(role: string, permission: string): string {
  return `${role}::${permission}`;
}

async function loadAllOverridesRaw(): Promise<Map<string, boolean>> {
  const rows = await prisma.rolePermissionOverride.findMany({
    select: { role: true, permission: true, granted: true },
  });
  const map = new Map<string, boolean>();
  for (const row of rows) {
    map.set(cacheKey(row.role, row.permission), row.granted);
  }
  return map;
}

/**
 * Return every `(role, permission) → boolean` currently overridden. The
 * result is memoized for a few seconds to keep `computePermissions` and
 * `requirePermission` cheap. Callers that mutate overrides must invoke
 * `invalidateRoleOverridesCache()` to force a refresh.
 */
export async function loadOverridesMap(): Promise<Map<string, boolean>> {
  const now = Date.now();
  if (cache && cache.expiresAt > now) return cache.map;
  const map = await loadAllOverridesRaw();
  cache = { expiresAt: now + CACHE_TTL_MS, map };
  return map;
}

export function invalidateRoleOverridesCache(): void {
  cache = null;
}

// -----------------------------------------------------------------------------
// Read helpers used by context.ts / require.ts
// -----------------------------------------------------------------------------

/**
 * Fast synchronous check once you already hold the overrides map. Returns
 * the effective (override-if-any, else default) grant for `(role, perm)`.
 */
export function isPermittedWithOverrides(
  role: RoleName,
  permission: PermissionString,
  overrides: Map<string, boolean>,
): boolean {
  const override = overrides.get(cacheKey(role, permission));
  if (override !== undefined) return override;
  return defaultAllowsPermission(role, permission);
}

/**
 * Convenience wrapper that loads overrides itself. Prefer this when a
 * caller only needs to check one permission and doesn't already have a
 * map on hand.
 */
export async function checkPermissionForRole(
  role: RoleName,
  permission: PermissionString,
): Promise<boolean> {
  const overrides = await loadOverridesMap();
  return isPermittedWithOverrides(role, permission, overrides);
}

/**
 * Given a role, compute the full set of permissions currently granted to
 * it (defaults + overrides). Used by `context.ts::computePermissions` to
 * build the snapshot sent to UI/nav filters.
 */
export async function computeAllowedPermissionsForRole(
  role: RoleName,
): Promise<PermissionString[]> {
  const overrides = await loadOverridesMap();
  const allowed: PermissionString[] = [];
  for (const perm of ALL_PERMISSIONS) {
    if (isPermittedWithOverrides(role, perm, overrides)) allowed.push(perm);
  }
  return allowed;
}

// -----------------------------------------------------------------------------
// Matrix for the admin UI
// -----------------------------------------------------------------------------

export async function getRoleMatrix(): Promise<RoleMatrix> {
  const overrides = await loadOverridesMap();
  const cells: Record<string, Record<string, RolePermissionCell>> = {};
  for (const role of ALL_ROLE_NAMES) {
    cells[role] = {};
    for (const perm of ALL_PERMISSIONS) {
      const defaultGranted = defaultAllowsPermission(role, perm);
      const override = overrides.get(cacheKey(role, perm));
      const effective = override !== undefined ? override : defaultGranted;
      cells[role]![perm] = {
        default: defaultGranted,
        effective,
        hasOverride: override !== undefined,
      };
    }
  }
  return { permissions: ALL_PERMISSIONS, roles: ALL_ROLE_NAMES, cells };
}

// -----------------------------------------------------------------------------
// Mutations
// -----------------------------------------------------------------------------

function assertKnownRole(role: string): asserts role is RoleName {
  if (!(ALL_ROLE_NAMES as string[]).includes(role)) {
    throw DomainErrors.badRequest(`Nepoznata rola: ${role}`);
  }
}

function assertKnownPermission(
  permission: string,
): asserts permission is PermissionString {
  if (!(ALL_PERMISSIONS as string[]).includes(permission)) {
    throw DomainErrors.badRequest(`Nepoznata dozvola: ${permission}`);
  }
}

export interface SetRolePermissionInput {
  role: string;
  permission: string;
  /**
   * `true` — force grant, `false` — force revoke, `"default"` — remove the
   * override so the compile-time default applies again.
   */
  granted: boolean | "default";
  reason?: string | null;
  actorUserId: string;
}

export async function setRolePermission(input: SetRolePermissionInput) {
  assertKnownRole(input.role);
  assertKnownPermission(input.permission);

  // SUPER_ADMIN's own grants are frozen — the operator must never lock
  // themselves out of the platform. If they want a different platform
  // role they should introduce a new one in code, not weaken this one.
  if (input.role === "SUPER_ADMIN" && input.permission.startsWith("platform.")) {
    throw DomainErrors.invalidState(
      "SUPER_ADMIN mora zadržati sve `platform.*` dozvole — ne može se osloboditi kontrole platforme.",
    );
  }

  const previous = await prisma.rolePermissionOverride.findUnique({
    where: {
      role_permission: { role: input.role, permission: input.permission },
    },
  });

  let record;
  if (input.granted === "default") {
    if (previous) {
      await prisma.rolePermissionOverride.delete({ where: { id: previous.id } });
    }
    record = null;
  } else {
    record = await prisma.rolePermissionOverride.upsert({
      where: {
        role_permission: { role: input.role, permission: input.permission },
      },
      update: {
        granted: input.granted,
        reason: input.reason ?? null,
        updatedByUserId: input.actorUserId,
      },
      create: {
        role: input.role,
        permission: input.permission,
        granted: input.granted,
        reason: input.reason ?? null,
        updatedByUserId: input.actorUserId,
      },
    });
  }

  invalidateRoleOverridesCache();

  await recordAudit({
    action: "role_override.set",
    entityType: "RolePermissionOverride",
    entityId: record?.id ?? previous?.id ?? `${input.role}:${input.permission}`,
    actorUserId: input.actorUserId,
    previousValues: previous ?? undefined,
    newValues: record ?? { cleared: true },
    metadata: {
      role: input.role,
      permission: input.permission,
      granted: input.granted,
    },
  });

  return record;
}

export async function resetRoleToDefaults(role: string, actorUserId: string) {
  assertKnownRole(role);
  const removed = await prisma.rolePermissionOverride.deleteMany({
    where: { role },
  });
  invalidateRoleOverridesCache();
  await recordAudit({
    action: "role_override.reset",
    entityType: "RolePermissionOverride",
    entityId: role,
    actorUserId,
    metadata: { role, removedCount: removed.count },
  });
  return { removed: removed.count };
}
