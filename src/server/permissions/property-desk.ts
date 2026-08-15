import "server-only";

import type {
  MarketingLead,
  PropertyDeskLeadScope,
  PropertyDeskTeamMember,
  PropertyDeskTeamRole,
} from "@prisma/client";

import { prisma } from "@/server/db/prisma";
import {
  AuthError,
  isSuperAdmin,
  requireSession,
  type AppSession,
} from "@/server/auth/session";
import type { PermissionString } from "@/server/permissions/access-control";
import {
  isPermittedWithOverrides,
  loadOverridesMap,
} from "@/server/services/permissions/role-overrides.service";
import { ROLE_LEVELS } from "@/server/services/property-desk/lead-lifecycle";

/**
 * Property Desk internal-team authorization.
 *
 * This is a platform-level operational layer that is intentionally SEPARATE
 * from tenant `Member.role` and from `User.role = SUPER_ADMIN`. A user may:
 *  - be a SUPER_ADMIN (global bypass everywhere)
 *  - be a member of a tenant organization (`Member.role`)
 *  - be an active Property Desk team member (`property_desk_team_member`)
 *
 * These layers do not interact — SUPER_ADMIN always bypasses Property Desk
 * checks without needing a team row.
 *
 * Permissions inside Property Desk (Sloj C) go through the same
 * `role_permission_override` layer as tenant roles: the compile-time
 * default lives in `roles.ts` (SETTER/CLOSER/OPERATIONS/MANAGER) and can
 * be overridden by SUPER_ADMIN through `/administracija/role`.
 */

export type PropertyDeskAccessContext = {
  session: AppSession;
  isSuperAdmin: true;
  teamMember: null;
} | {
  session: AppSession;
  isSuperAdmin: false;
  teamMember: PropertyDeskTeamMember;
};

// -----------------------------------------------------------------------------
// Cache — small in-process cache to avoid a DB roundtrip on every page/API
// call in the admin section. Invalidated on any mutation via
// `invalidatePropertyDeskTeamCache`.
// -----------------------------------------------------------------------------

const TEAM_CACHE_MS = 30_000;
const teamCache = new Map<
  string,
  { at: number; member: PropertyDeskTeamMember | null }
>();

export function invalidatePropertyDeskTeamCache(userId?: string): void {
  if (userId) {
    teamCache.delete(userId);
  } else {
    teamCache.clear();
  }
}

export async function getPropertyDeskTeamMember(
  userId: string,
): Promise<PropertyDeskTeamMember | null> {
  const now = Date.now();
  const hit = teamCache.get(userId);
  if (hit && now - hit.at < TEAM_CACHE_MS) return hit.member;

  const row = await prisma.propertyDeskTeamMember.findUnique({
    where: { userId },
  });
  teamCache.set(userId, { at: now, member: row });
  return row;
}

// -----------------------------------------------------------------------------
// Guards
// -----------------------------------------------------------------------------

/**
 * Assert the caller has access to `/administracija/property-desk/**`.
 * Passes for SUPER_ADMIN unconditionally; otherwise requires an enabled
 * `property_desk_team_member` row.
 */
export async function requirePropertyDeskAccess(): Promise<PropertyDeskAccessContext> {
  const session = await requireSession();
  if (isSuperAdmin(session)) {
    return { session, isSuperAdmin: true, teamMember: null };
  }
  const member = await getPropertyDeskTeamMember(session.user.id);
  if (!member || !member.enabled) {
    throw new AuthError(
      "FORBIDDEN",
      "Nemate pristup Property Desk operativnom timu.",
    );
  }
  return { session, isSuperAdmin: false, teamMember: member };
}

/**
 * Check if a Property Desk access context allows the given `pd_*` permission
 * (or any other resource for that matter — Super Admin has all of them).
 * Returns a boolean; does not throw.
 */
export async function hasPdPermission(
  ctx: PropertyDeskAccessContext,
  permission: PermissionString,
): Promise<boolean> {
  if (ctx.isSuperAdmin) return true;
  const overrides = await loadOverridesMap();
  return isPermittedWithOverrides(
    ctx.teamMember.teamRole,
    permission,
    overrides,
  );
}

/**
 * Throw `FORBIDDEN` when the caller cannot perform the given `pd_*` action.
 * Prefer this over `requirePropertyDeskTeamRole([...])` in new code — it
 * routes through the override layer so SUPER_ADMIN can retune roles from
 * the admin console without a redeploy.
 */
export async function requirePdPermission(
  ctx: PropertyDeskAccessContext,
  permission: PermissionString,
): Promise<PropertyDeskAccessContext> {
  const allowed = await hasPdPermission(ctx, permission);
  if (!allowed) {
    throw new AuthError(
      "FORBIDDEN",
      `Nemate dozvolu za: ${permission}.`,
    );
  }
  return ctx;
}

/**
 * Legacy helper — kept for callers that still enforce by role name. Prefer
 * `requirePdPermission()` in new code. This variant still short-circuits
 * for SUPER_ADMIN and otherwise checks that the team member's `teamRole`
 * is in the given list.
 */
export async function requirePropertyDeskTeamRole(
  roles: readonly PropertyDeskTeamRole[],
): Promise<PropertyDeskAccessContext> {
  const ctx = await requirePropertyDeskAccess();
  if (ctx.isSuperAdmin) return ctx;
  if (!roles.includes(ctx.teamMember.teamRole)) {
    throw new AuthError(
      "FORBIDDEN",
      "Za ovu radnju potrebna je viša uloga u Property Desk timu.",
    );
  }
  return ctx;
}

// -----------------------------------------------------------------------------
// Lead visibility scoping
// -----------------------------------------------------------------------------

/**
 * Whether the caller can see the given marketing lead.
 *
 * Fast path: SUPER_ADMIN always sees everything.
 *
 * Slow path (per request, but cheap because overrides are cached): first
 * consult `pd_lead.view_team` — if granted, the caller sees every lead in
 * the pipeline regardless of `leadScope` ili level. Inače lead mora da
 * bude u level-u koji je za rolu (`ROLE_LEVELS[teamRole]`) i unutar
 * konfigurisanog `leadScope`-a.
 */
export async function canViewMarketingLead(
  ctx: PropertyDeskAccessContext,
  lead: Pick<MarketingLead, "assignedToUserId" | "level">,
): Promise<boolean> {
  if (ctx.isSuperAdmin) return true;
  const overrides = await loadOverridesMap();
  if (
    isPermittedWithOverrides(
      ctx.teamMember.teamRole,
      "pd_lead.view_team",
      overrides,
    )
  ) {
    return true;
  }
  const allowedLevels = ROLE_LEVELS[ctx.teamMember.teamRole];
  if (!allowedLevels.includes(lead.level)) return false;
  return matchesScope(ctx.teamMember, lead.assignedToUserId);
}

/**
 * Can the caller mutate this lead (assign, stage, details, classification)?
 *
 * MANAGER + SUPER_ADMIN (and anyone with `pd_lead.view_team`) uvek
 * može. Ostali PD članovi pišu isključivo u level-e koji su za njihovu
 * rolu (`ROLE_LEVELS[teamRole]`). Ovo je *dodatak* na dozvole per akciji
 * — `hasPdPermission` i dalje odlučuje koje su radnje uopšte dozvoljene.
 */
export async function canWriteLead(
  ctx: PropertyDeskAccessContext,
  lead: Pick<MarketingLead, "level">,
): Promise<boolean> {
  if (ctx.isSuperAdmin) return true;
  if (ctx.teamMember.teamRole === "MANAGER") return true;
  const overrides = await loadOverridesMap();
  if (
    isPermittedWithOverrides(
      ctx.teamMember.teamRole,
      "pd_lead.view_team",
      overrides,
    )
  ) {
    return true;
  }
  return ROLE_LEVELS[ctx.teamMember.teamRole].includes(lead.level);
}

function matchesScope(
  member: PropertyDeskTeamMember,
  assignedToUserId: string | null,
): boolean {
  switch (member.leadScope as PropertyDeskLeadScope) {
    case "OWN":
      return assignedToUserId === member.userId;
    case "OWN_AND_UNASSIGNED":
      return assignedToUserId === null || assignedToUserId === member.userId;
    case "TEAM":
    case "ALL":
      return true;
    default:
      return false;
  }
}

/**
 * Prisma `where` fragment that filters marketing leads by the caller's
 * effective visibility.
 *
 * SUPER_ADMIN + anyone with `pd_lead.view_team` gets `{}` (no restriction).
 * Otherwise the caller's `leadScope` maps to the appropriate filter.
 *
 * Combine with additional filters:
 *
 * ```ts
 * const where = {
 *   AND: [
 *     await buildMarketingLeadScopeFilter(ctx),
 *     { stage: "NEW" },
 *   ],
 * };
 * ```
 */
export async function buildMarketingLeadScopeFilter(
  ctx: PropertyDeskAccessContext,
): Promise<Record<string, unknown>> {
  if (ctx.isSuperAdmin) return {};
  const overrides = await loadOverridesMap();
  if (
    isPermittedWithOverrides(
      ctx.teamMember.teamRole,
      "pd_lead.view_team",
      overrides,
    )
  ) {
    return {};
  }
  const levels = ROLE_LEVELS[ctx.teamMember.teamRole];
  const levelFilter: Record<string, unknown> = {
    level: { in: levels },
  };
  const scopeFilter = leadScopeFilter(ctx.teamMember);
  return { AND: [levelFilter, scopeFilter] };
}

function leadScopeFilter(
  member: PropertyDeskTeamMember,
): Record<string, unknown> {
  switch (member.leadScope as PropertyDeskLeadScope) {
    case "OWN":
      return { assignedToUserId: member.userId };
    case "OWN_AND_UNASSIGNED":
      return {
        OR: [
          { assignedToUserId: member.userId },
          { assignedToUserId: null },
        ],
      };
    case "TEAM":
    case "ALL":
      return {};
    default:
      // Fail closed — an unknown scope filters everything out.
      return { id: "___never___" };
  }
}
