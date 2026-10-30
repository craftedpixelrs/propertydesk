import "server-only";

import { prisma } from "@/server/db/prisma";
import { type PermissionString } from "@/server/permissions/access-control";
import { ALL_ORG_ROLE_NAMES, type OrganizationRole } from "@/server/permissions/roles";
import { checkPermissionForRole } from "@/server/services/permissions/role-overrides.service";

/**
 * Faza 11 — resolve the current set of org members who hold a given
 * permission. Used by manager flows that want to notify "everyone who can
 * do X" (e.g. the technicians + owners when a resident files a ticket).
 *
 * We re-use the override-aware `checkPermissionForRole` so a tenant that
 * tweaked their matrix in `/administracija/role` sees the same answer the
 * route-level guards would give.
 */
export interface OrgMemberContact {
  userId: string;
  role: string;
  email: string;
  name: string | null;
}

export async function listOrgMembersWithPermission(
  organizationId: string,
  permission: PermissionString,
): Promise<OrgMemberContact[]> {
  // Pre-compute which org roles satisfy the permission to avoid an N× DB
  // round-trip inside the per-member loop. Platform `SUPER_ADMIN` is
  // intentionally excluded: they're not members of the tenant.
  const allowedRoles = new Set<OrganizationRole>();
  for (const role of ALL_ORG_ROLE_NAMES) {
    // eslint-disable-next-line no-await-in-loop
    if (await checkPermissionForRole(role, permission)) {
      allowedRoles.add(role);
    }
  }
  if (allowedRoles.size === 0) return [];

  const members = await prisma.member.findMany({
    where: {
      organizationId,
      role: { in: Array.from(allowedRoles) },
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          banned: true,
          deactivatedAt: true,
        },
      },
    },
  });

  const seen = new Set<string>();
  const out: OrgMemberContact[] = [];
  for (const m of members) {
    if (!m.user) continue;
    if (m.user.banned) continue;
    if (m.user.deactivatedAt) continue;
    const email = (m.user.email ?? "").trim().toLowerCase();
    if (!/.+@.+\..+/.test(email)) continue;
    if (seen.has(m.user.id)) continue;
    seen.add(m.user.id);
    out.push({
      userId: m.user.id,
      role: m.role,
      email,
      name: m.user.name ?? null,
    });
  }
  return out;
}
