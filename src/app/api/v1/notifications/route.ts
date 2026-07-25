import { apiHandler } from "@/lib/api/handler";
import { paginate } from "@/lib/api/query";
import { requireSession } from "@/server/auth/session";
import { listNotifications } from "@/server/services/notifications.service";

export const GET = apiHandler({}, async ({ query, searchParams }) => {
  const session = await requireSession();
  const { items, total, unreadCount } = await listNotifications({
    userId: session.user.id,
    page: query.page,
    pageSize: query.pageSize,
    unreadOnly: searchParams.get("unreadOnly") === "true",
  });
  const { items: pageItems, pagination } = paginate(items, query.page, query.pageSize, total);
  return { data: pageItems, meta: { pagination, unreadCount } };
});
