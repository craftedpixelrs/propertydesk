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
