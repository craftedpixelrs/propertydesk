import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { requirePropertyDeskAccess } from "@/server/permissions/property-desk";
import {
  getLeadTaskCounts,
  listTasksForView,
} from "@/server/services/property-desk/marketing-lead-tasks.service";

const querySchema = z.object({
  view: z
    .enum(["MINE_OPEN", "MINE_OVERDUE", "OPEN", "OVERDUE", "ALL"])
    .default("MINE_OPEN"),
  counts: z.enum(["1", "0"]).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
});

export const GET = apiHandler({}, async ({ searchParams }) => {
  const ctx = await requirePropertyDeskAccess();
  const parsed = querySchema.parse(Object.fromEntries(searchParams.entries()));

  if (parsed.counts === "1") {
    const counts = await getLeadTaskCounts(ctx);
    return { data: counts };
  }

  const items = await listTasksForView(ctx, parsed.view, parsed.limit);
  return { data: items };
});

/**
 * @swagger
 * /api/v1/platform/property-desk/tasks:
 *   get:
 *     tags:
 *       - platform-property-desk
 *     summary: Cross-lead lista taskova (dashboard tabovi)
 *     description: |
 *       **Auth:** `requirePropertyDeskAccess() + pd_lead_task.read`
 *
 *       `view` određuje šta se vraća:
 *       - `MINE_OPEN` — moji nezavršeni taskovi
 *       - `MINE_OVERDUE` — moji taskovi sa `dueAt < now()` bez `completedAt`
 *       - `OPEN` — svi nezavršeni u okviru `leadScope`
 *       - `OVERDUE` — svi overdue u okviru `leadScope`
 *       - `ALL` — svi taskovi u `leadScope`
 *
 *       Sa `counts=1` vraća brojače za dashboard tile-ove (bez liste).
 *     parameters:
 *       - in: query
 *         name: view
 *         schema:
 *           type: string
 *       - in: query
 *         name: counts
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       "200":
 *         description: OK
 */
