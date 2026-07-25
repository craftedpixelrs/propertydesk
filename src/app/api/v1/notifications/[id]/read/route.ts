import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { requireSession } from "@/server/auth/session";
import { markNotificationRead } from "@/server/services/notifications.service";

const paramsSchema = z.object({ id: z.string().min(1) });

export const POST = apiHandler({ paramsSchema }, async ({ params }) => {
  const session = await requireSession();
  await markNotificationRead(session.user.id, params.id);
  return { data: { ok: true } };
});
