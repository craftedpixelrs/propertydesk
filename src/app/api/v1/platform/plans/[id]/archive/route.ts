import { z } from "zod";
import { apiHandler } from "@/lib/api/handler";
import { requireSuperAdmin } from "@/server/permissions/require";
import {
  archiveSaaSPlan,
  restoreSaaSPlan,
} from "@/server/services/platform.service";

const paramsSchema = z.object({ id: z.string().min(1) });

const bodySchema = z.object({
  action: z.enum(["archive", "restore"]),
});

/**
 * POST /api/v1/platform/plans/{id}/archive
 *
 * Body: `{ action: "archive" | "restore" }`. Soft-deactivates or
 * re-enables a plan without touching existing subscriptions/invoices
 * that reference it. Use this rather than DELETE whenever the plan
 * has any historical footprint.
 */
export const POST = apiHandler(
  { paramsSchema, bodySchema },
  async ({ params, body }) => {
    const ctx = await requireSuperAdmin();
    const plan =
      body.action === "archive"
        ? await archiveSaaSPlan(params.id, ctx.session.user.id)
        : await restoreSaaSPlan(params.id, ctx.session.user.id);
    return { data: plan };
  },
);
