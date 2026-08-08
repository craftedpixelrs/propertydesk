"use client";

import type { ReactNode } from "react";
import { usePermissions } from "@/components/app/user-context";
import type { PermissionString } from "@/server/permissions/access-control";

/**
 * Client-side permission gate. Hides UI that the caller has no right to
 * interact with. This is a UX affordance ONLY — every mutation must be
 * re-checked on the server via `requirePermission`.
 *
 * Reads from the shared `UserContext` (populated by the dashboard layout),
 * so this component performs no network calls of its own.
 */
export interface PermissionGuardProps {
  permission?: PermissionString;
  anyOf?: PermissionString[];
  requireSuperAdmin?: boolean;
  fallback?: ReactNode;
  children: ReactNode;
}

export function PermissionGuard({
  permission,
  anyOf,
  requireSuperAdmin,
  fallback = null,
  children,
}: PermissionGuardProps) {
  const perms = usePermissions();

  if (requireSuperAdmin && !perms.isSuperAdmin) return <>{fallback}</>;
  if (permission && !perms.has(permission)) return <>{fallback}</>;
  if (anyOf && anyOf.length > 0 && !perms.hasAny(anyOf)) return <>{fallback}</>;

  return <>{children}</>;
}
