import { apiHandler } from "@/lib/api/handler";
import { paginate } from "@/lib/api/query";
import { requirePermission } from "@/server/permissions/require";
import { listActivities } from "@/server/services/activities.service";
import type { ActivityType } from "@prisma/client";

const ACTIVITY_TYPES = [
  "NOTE",
  "CALL",
  "EMAIL",
  "MEETING",
  "VIEWING",
  "OFFER",
  "STATUS_CHANGE",
  "SYSTEM",
] as const;

function parseCsvList(raw: string | null): ActivityType[] | undefined {
  if (!raw) return undefined;
  const values = raw.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean);
  const filtered = values.filter((v): v is ActivityType =>
    (ACTIVITY_TYPES as readonly string[]).includes(v),
  );
  return filtered.length > 0 ? filtered : undefined;
}

export const GET = apiHandler({}, async ({ query, searchParams }) => {
  const ctx = await requirePermission("lead.read");
  const { items, total } = await listActivities({
    organizationId: ctx.organization.organizationId,
    page: query.page,
    pageSize: query.pageSize,
    buyerId: searchParams.get("buyerId") ?? undefined,
    projectId: searchParams.get("projectId") ?? undefined,
    type: parseCsvList(searchParams.get("type")),
  });
  const { items: pageItems, pagination } = paginate(items, query.page, query.pageSize, total);
  return { data: pageItems, meta: { pagination } };
});
