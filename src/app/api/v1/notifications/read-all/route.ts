import { apiHandler } from "@/lib/api/handler";
import { requireSession } from "@/server/auth/session";
import { markAllNotificationsRead } from "@/server/services/notifications.service";

export const POST = apiHandler({}, async () => {
  const session = await requireSession();
  const count = await markAllNotificationsRead(session.user.id);
  return { data: { count } };
});
