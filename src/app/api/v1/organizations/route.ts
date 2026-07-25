import { apiHandler } from "@/lib/api/handler";
import { requireSession, isSuperAdmin } from "@/server/auth/session";
import { paginate } from "@/lib/api/query";
import { listOrganizationsForUser } from "@/server/services/organizations.service";

/**
 * List organizations visible to the current caller.
 *
 * - SUPER_ADMIN: sees all organizations (paginated).
 * - Regular user: sees only organizations they are a member of.
 *
 * This is intentionally the ONLY entry point for org listing — all
 * scoping happens inside `listOrganizationsForUser`, not here.
 */
export const GET = apiHandler({}, async ({ query }) => {
  const session = await requireSession();

  const { items, total } = await listOrganizationsForUser({
    userId: session.user.id,
    isSuperAdmin: isSuperAdmin(session),
    page: query.page,
    pageSize: query.pageSize,
    search: query.q,
  });

  const { items: pageItems, pagination } = paginate(items, query.page, query.pageSize, total);

  return {
    data: pageItems,
    meta: { pagination },
  };
});
