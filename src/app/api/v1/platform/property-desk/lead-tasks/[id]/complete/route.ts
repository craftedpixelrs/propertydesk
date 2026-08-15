import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { requirePropertyDeskAccess } from "@/server/permissions/property-desk";
import { completeLeadTask } from "@/server/services/property-desk/marketing-lead-tasks.service";

const paramsSchema = z.object({ id: z.string().min(1) });

const bodySchema = z.object({
  completed: z.boolean(),
});

export const POST = apiHandler(
  { paramsSchema, bodySchema },
  async ({ params, body }) => {
    const ctx = await requirePropertyDeskAccess();
    const task = await completeLeadTask(ctx, params.id, body.completed);
    return { data: task };
  },
);

/**
 * @swagger
 * /api/v1/platform/property-desk/lead-tasks/{id}/complete:
 *   post:
 *     tags:
 *       - platform-property-desk
 *     summary: Označi task kao završen ili ponovo otvoren
 *     description: |
 *       **Auth:** `requirePropertyDeskAccess() + pd_lead_task.complete`
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               completed:
 *                 type: boolean
 *             required:
 *               - completed
 *     responses:
 *       "200":
 *         description: OK
 */
