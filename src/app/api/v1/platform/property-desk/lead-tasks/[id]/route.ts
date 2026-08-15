import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { requirePropertyDeskAccess } from "@/server/permissions/property-desk";
import { updateLeadTask } from "@/server/services/property-desk/marketing-lead-tasks.service";

const paramsSchema = z.object({ id: z.string().min(1) });

const patchBody = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(4000).nullable().optional(),
  dueAt: z
    .string()
    .datetime()
    .nullable()
    .optional()
    .transform((v) => (v ? new Date(v) : v === null ? null : undefined)),
  assignedToUserId: z.string().min(1).nullable().optional(),
});

export const PATCH = apiHandler(
  { paramsSchema, bodySchema: patchBody },
  async ({ params, body }) => {
    const ctx = await requirePropertyDeskAccess();
    const task = await updateLeadTask(ctx, params.id, body);
    return { data: task };
  },
);

/**
 * @swagger
 * /api/v1/platform/property-desk/lead-tasks/{id}:
 *   patch:
 *     tags:
 *       - platform-property-desk
 *     summary: Izmena taska nad marketing lead-om
 *     description: |
 *       **Auth:** `requirePropertyDeskAccess() + pd_lead_task.create`.
 *       Ako se `assignedToUserId` menja u nekoga ko nije pozivalac,
 *       dodatno se traži `pd_lead_task.assign`.
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
 *             additionalProperties: true
 *     responses:
 *       "200":
 *         description: OK
 */
