import "server-only";

import { prisma } from "@/server/db/prisma";
import type { PermissionString } from "@/server/permissions/access-control";

/**
 * Permissions still allowed when the org is RESTRICTED (expired trial /
 * unpaid period). Tenants can read billing and their own org, nothing else.
 */
export const DEFAULT_RESTRICTED_ALLOWLIST: PermissionString[] = [
  "organization.read",
  "billing.read",
  "billing.subscription.read",
  "billing.invoice.read",
  "billing.payment.read",
  "document.read",
];

let restrictedCache: { at: number; set: Set<string> } | null = null;
const RESTRICTED_CACHE_MS = 30_000;

export async function getRestrictedModeAllowlist(): Promise<Set<string>> {
  const now = Date.now();
  if (restrictedCache && now - restrictedCache.at < RESTRICTED_CACHE_MS) {
    return restrictedCache.set;
  }
  let list: string[] = DEFAULT_RESTRICTED_ALLOWLIST.slice();
  try {
    const gbs = await prisma.globalBillingSettings.findFirst({
      where: { active: true },
      select: { restrictedModeAllowedPermissions: true },
    });
    if (gbs && Array.isArray(gbs.restrictedModeAllowedPermissions)) {
      const parsed = gbs.restrictedModeAllowedPermissions as unknown[];
      const stringPerms = parsed.filter(
        (v): v is string => typeof v === "string" && v.length > 0,
      );
      if (stringPerms.length > 0) list = stringPerms;
    }
  } catch {
    // Settings table missing during migrations — keep defaults.
  }
  const set = new Set<string>(list);
  restrictedCache = { at: now, set };
  return set;
}

export function clearRestrictedAllowlistCache(): void {
  restrictedCache = null;
}

export function filterPermissionsForRestrictedMode(
  permissions: PermissionString[],
  allowlist: Set<string>,
): PermissionString[] {
  return permissions.filter((p) => allowlist.has(p));
}
