"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { PermissionString } from "@/server/permissions/access-control";

/**
 * Client-side snapshot of the current user's context (org, role, permissions).
 *
 * Populated once by the dashboard server layout and made available to the
 * whole tree via React context, so components like `PermissionGuard` can
 * gate UI without repeated network calls.
 */

export interface ClientUserContext {
  user: {
    id: string;
    name: string;
    email: string;
    image: string | null;
  };
  isSuperAdmin: boolean;
  activeOrganization: {
    id: string;
    name: string;
    type: "INVESTOR" | "AGENCY" | null;
    role: string | null;
    status: "TRIAL" | "ACTIVE" | "RESTRICTED" | "SUSPENDED" | "CLOSED" | null;
  } | null;
  /**
   * Property Desk internal-team membership snapshot for the current caller.
   * `null` for anyone who is not on the internal SaaS marketing/sales team.
   * A SUPER_ADMIN who was not explicitly added to the team gets `null` here
   * (they still have full access via `isSuperAdmin`).
   */
  propertyDeskTeam: {
    teamRole: "SETTER" | "CLOSER" | "OPERATIONS" | "MANAGER";
    leadScope: "OWN" | "OWN_AND_UNASSIGNED" | "TEAM" | "ALL";
    enabled: boolean;
  } | null;
  permissions: PermissionString[];
}

const UserContextCtx = createContext<ClientUserContext | null>(null);

export function UserContextProvider({
  value,
  children,
}: {
  value: ClientUserContext;
  children: ReactNode;
}) {
  return <UserContextCtx.Provider value={value}>{children}</UserContextCtx.Provider>;
}

export function useUserContext(): ClientUserContext | null {
  return useContext(UserContextCtx);
}

export function useRequiredUserContext(): ClientUserContext {
  const ctx = useContext(UserContextCtx);
  if (!ctx) {
    throw new Error("UserContextProvider is missing from the tree.");
  }
  return ctx;
}

export function usePermissions() {
  const ctx = useUserContext();
  const set = useMemo(
    () => new Set(ctx?.permissions ?? []),
    [ctx?.permissions],
  );
  return useMemo(
    () => ({
      has: (perm: PermissionString): boolean => {
        if (!ctx) return false;
        if (ctx.isSuperAdmin) return true;
        return set.has(perm);
      },
      hasAny: (perms: PermissionString[]): boolean => {
        if (!ctx) return false;
        if (ctx.isSuperAdmin) return true;
        return perms.some((p) => set.has(p));
      },
      isSuperAdmin: Boolean(ctx?.isSuperAdmin),
    }),
    [ctx, set],
  );
}

/**
 * Shorthand for gating Property Desk UI on a specific `pd_*` permission.
 * Returns `true` for SUPER_ADMIN and for team members whose current role
 * (default + overrides) grants the permission.
 *
 * ```tsx
 * const canConvert = usePdPermission("pd_lead.convert");
 * ```
 */
export function usePdPermission(
  perm: `pd_${string}` extends PermissionString
    ? PermissionString
    : PermissionString,
): boolean {
  const { has } = usePermissions();
  return has(perm);
}
