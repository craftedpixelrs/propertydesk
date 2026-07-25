import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { ApiError } from "@/lib/api/errors";
import { requireSuperAdmin } from "@/server/permissions/require";
import { prisma } from "@/server/db/prisma";
import { restrictSubscription } from "@/server/services/billing/subscriptions.service";

const paramsSchema = z.object({ id: z.string().min(1) });
const bodySchema = z.object({ reason: z.string().min(2).max(500) });

export const POST = apiHandler(
  { paramsSchema, bodySchema },
  async ({ params, body }) => {
    const ctx = await requireSuperAdmin();
    const sub = await prisma.organizationSubscription.findUnique({
      where: { id: params.id },
      select: { organizationId: true },
    });
    if (!sub) throw new ApiError("NOT_FOUND", "Pretplata nije pronađena.");
    const updated = await restrictSubscription(
      sub.organizationId,
      body.reason,
      ctx.session.user.id,
    );
    return { data: updated };
  },
);
