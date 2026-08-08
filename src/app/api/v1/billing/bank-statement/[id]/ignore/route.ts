import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { requireSuperAdmin } from "@/server/permissions/require";
import { ignoreTransaction } from "@/server/services/billing/bank-statement/service";

const paramsSchema = z.object({ id: z.string().min(1) });
const bodySchema = z.object({ reason: z.string().min(2).max(500) });

export const POST = apiHandler(
  { paramsSchema, bodySchema },
  async ({ params, body }) => {
    const ctx = await requireSuperAdmin();
    await ignoreTransaction({
      transactionId: params.id,
      reason: body.reason,
      actorUserId: ctx.session.user.id,
    });
    return { data: { ok: true } };
  },
);
