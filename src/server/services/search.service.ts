import "server-only";

import type { UserContext } from "@/server/auth/context";
import { requirePropertyDeskAccess } from "@/server/permissions/property-desk";
import { listBuyers } from "@/server/services/buyers.service";
import {
  listAllOrganizations,
  listAllUsers,
} from "@/server/services/platform.service";
import { listProjects } from "@/server/services/projects.service";
import { listMarketingLeads } from "@/server/services/property-desk/marketing-leads.service";
import { listUnits } from "@/server/services/units.service";

export type SearchEntity =
  | "project"
  | "unit"
  | "buyer"
  | "organization"
  | "user"
  | "lead";

export interface SearchHit {
  entity: SearchEntity;
  id: string;
  title: string;
  subtitle: string | null;
  href: string;
}

export interface SearchCaller {
  isSuperAdmin: boolean;
  permissions: readonly string[];
  activeOrganization: { id: string } | null;
  propertyDeskTeam: { enabled: boolean } | null;
}

export function canSearchTenant(caller: SearchCaller): boolean {
  return Boolean(caller.activeOrganization?.id);
}

export function canSearchPlatform(caller: SearchCaller): boolean {
  return caller.isSuperAdmin;
}

export function canSearchLeads(caller: SearchCaller): boolean {
  return caller.isSuperAdmin || Boolean(caller.propertyDeskTeam?.enabled);
}

function empty<T>(): Promise<{ items: T[] }> {
  return Promise.resolve({ items: [] });
}

/**
 * Global command-palette search.
 *
 * A logged-in user without an active organization (typical for SUPER_ADMIN
 * / Property Desk operators in `/administracija`) must still get a 200
 * with whatever platform hits they are allowed to see — never a 401.
 */
export async function runGlobalSearch(input: {
  caller: SearchCaller;
  q: string;
  perEntity?: number;
}): Promise<SearchHit[]> {
  const q = input.q.trim();
  if (q.length < 1) return [];
  const perEntity = input.perEntity ?? 5;
  const perms = new Set(input.caller.permissions);
  const organizationId = input.caller.activeOrganization?.id ?? null;

  const projectsP =
    organizationId && perms.has("project.read")
      ? listProjects({
          organizationId,
          page: 1,
          pageSize: perEntity,
          search: q,
          activeOnly: true,
        }).catch(() => ({ items: [] }))
      : empty();
  const unitsP =
    organizationId && perms.has("inventory.read")
      ? listUnits({
          organizationId,
          page: 1,
          pageSize: perEntity,
          search: q,
          activeOnly: true,
        }).catch(() => ({ items: [] }))
      : empty();
  const buyersP =
    organizationId && perms.has("buyer.read")
      ? listBuyers({
          organizationId,
          page: 1,
          pageSize: perEntity,
          search: q,
          activeOnly: true,
        }).catch(() => ({ items: [] }))
      : empty();

  const orgsP = canSearchPlatform(input.caller)
    ? listAllOrganizations({
        page: 1,
        pageSize: perEntity,
        search: q,
      }).catch(() => ({ items: [] }))
    : empty();
  const usersP = canSearchPlatform(input.caller)
    ? listAllUsers({
        page: 1,
        pageSize: perEntity,
        search: q,
      }).catch(() => ({ items: [] }))
    : empty();

  const leadsP = canSearchLeads(input.caller)
    ? requirePropertyDeskAccess()
        .then((pd) =>
          listMarketingLeads(pd, { q, page: 1, pageSize: perEntity }),
        )
        .catch(() => ({ items: [] }))
    : empty();

  const [projects, units, buyers, organizations, users, leadList] =
    await Promise.all([projectsP, unitsP, buyersP, orgsP, usersP, leadsP]);

  const hits: SearchHit[] = [
    ...projects.items.map(
      (p): SearchHit => ({
        entity: "project",
        id: p.id,
        title: p.name,
        subtitle: [p.code, p.city].filter(Boolean).join(" · ") || null,
        href: `/projekti/${p.id}`,
      }),
    ),
    ...units.items.map(
      (u): SearchHit => ({
        entity: "unit",
        id: u.id,
        title: u.code,
        subtitle: u.project?.name ?? null,
        href: `/jedinice/${u.id}`,
      }),
    ),
    ...buyers.items.map(
      (b): SearchHit => ({
        entity: "buyer",
        id: b.id,
        title: `${b.firstName} ${b.lastName}`.trim(),
        subtitle: b.email ?? b.phone ?? null,
        href: `/kupci/${b.id}`,
      }),
    ),
    ...organizations.items.map(
      (o): SearchHit => ({
        entity: "organization",
        id: o.id,
        title: o.name,
        subtitle: [o.slug, o.type].filter(Boolean).join(" · ") || null,
        href: `/administracija/organizacije/${o.id}/naplata`,
      }),
    ),
    ...users.items.map((u): SearchHit => {
      const orgName = u.memberships[0]?.organizationName ?? null;
      return {
        entity: "user",
        id: u.id,
        title: u.name?.trim() || u.email,
        subtitle: [u.email, orgName].filter(Boolean).join(" · ") || null,
        href: `/administracija/korisnici?q=${encodeURIComponent(u.email)}`,
      };
    }),
    ...leadList.items.map((lead): SearchHit => {
      const name = `${lead.firstName ?? ""} ${lead.lastName ?? ""}`.trim();
      return {
        entity: "lead",
        id: lead.id,
        title: name || lead.email || lead.companyName || "Lead",
        subtitle:
          [lead.email, lead.city, lead.companyName].filter(Boolean).join(" · ") ||
          null,
        href: `/administracija/property-desk/leadovi/${lead.id}`,
      };
    }),
  ];

  return hits;
}

export function toSearchCaller(ctx: UserContext): SearchCaller {
  return {
    isSuperAdmin: ctx.isSuperAdmin,
    permissions: ctx.permissions,
    activeOrganization: ctx.activeOrganization
      ? { id: ctx.activeOrganization.id }
      : null,
    propertyDeskTeam: ctx.propertyDeskTeam
      ? { enabled: ctx.propertyDeskTeam.enabled }
      : null,
  };
}
