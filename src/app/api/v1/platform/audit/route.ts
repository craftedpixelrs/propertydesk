import { apiHandler } from "@/lib/api/handler";
import { paginate } from "@/lib/api/query";
import { requireSuperAdmin } from "@/server/permissions/require";
import { listAuditLogs } from "@/server/services/platform.service";

export const GET = apiHandler({}, async ({ query, searchParams }) => {
  await requireSuperAdmin();

  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const { items, total } = await listAuditLogs({
    page: query.page,
    pageSize: query.pageSize,
    organizationId: query.filters.organizationId,
    action: query.filters.action,
    entityType: query.filters.entityType,
    from: from ? new Date(from) : undefined,
    to: to ? new Date(to) : undefined,
  });

  const { items: pageItems, pagination } = paginate(
    items,
    query.page,
    query.pageSize,
    total,
  );

  return { data: pageItems, meta: { pagination } };
});
