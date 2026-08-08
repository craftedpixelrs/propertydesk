import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { loadUserContext } from "@/server/auth/context";
import { ApiError } from "@/lib/api/errors";
import { listProjects } from "@/server/services/projects.service";
import { listUnits } from "@/server/services/units.service";
import { listBuyers } from "@/server/services/buyers.service";

/**
 * Global command-palette search endpoint.
 *
 * Each entity type is fetched only when the caller has the matching
 * `*.read` permission — an agency operator will never receive the
 * investor's buyers here. The result set is intentionally tiny
 * (`take: 5` per entity type) because this is meant to power a
 * type-ahead palette, not a search page.
 */

const querySchema = z.object({
  q: z.string().trim().min(1).max(200),
  limit: z.coerce.number().int().min(1).max(20).optional(),
});

export interface SearchHit {
  entity: "project" | "unit" | "buyer";
  id: string;
  title: string;
  subtitle: string | null;
  href: string;
}

export const GET = apiHandler({}, async ({ req }) => {
  const ctx = await loadUserContext();
  if (!ctx || !ctx.activeOrganization) {
    throw new ApiError("UNAUTHENTICATED", "Prijava je obavezna.", {
      statusCode: 401,
    });
  }

  const parsed = querySchema.safeParse({
    q: req.nextUrl.searchParams.get("q") ?? "",
    limit: req.nextUrl.searchParams.get("limit") ?? undefined,
  });
  if (!parsed.success) {
    return { data: { hits: [] as SearchHit[] } };
  }

  const q = parsed.data.q;
  const perEntity = parsed.data.limit ?? 5;
  const organizationId = ctx.activeOrganization.id;
  const perms = new Set(ctx.permissions);

  const [projects, units, buyers] = await Promise.all([
    perms.has("project.read")
      ? listProjects({
          organizationId,
          page: 1,
          pageSize: perEntity,
          search: q,
          activeOnly: true,
        }).catch(() => ({ items: [] }))
      : Promise.resolve({ items: [] }),
    perms.has("inventory.read")
      ? listUnits({
          organizationId,
          page: 1,
          pageSize: perEntity,
          search: q,
          activeOnly: true,
        }).catch(() => ({ items: [] }))
      : Promise.resolve({ items: [] }),
    perms.has("buyer.read")
      ? listBuyers({
          organizationId,
          page: 1,
          pageSize: perEntity,
          search: q,
          activeOnly: true,
        }).catch(() => ({ items: [] }))
      : Promise.resolve({ items: [] }),
  ]);

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
  ];

  return { data: { hits } };
});
