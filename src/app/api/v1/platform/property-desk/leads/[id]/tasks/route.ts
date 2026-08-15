import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { requirePropertyDeskAccess } from "@/server/permissions/property-desk";
import {
  createLeadTask,
  listTasksForLead,
} from "@/server/services/property-desk/marketing-lead-tasks.service";

const paramsSchema = z.object({ id: z.string().min(1) });

const bodySchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(4000).nullable().optional(),
  dueAt: z
    .string()
    .datetime()
    .nullable()
    .optional()
    .transform((v) => (v ? new Date(v) : v === null ? null : undefined)),
  assignedToUserId: z.string().min(1).nullable().optional(),
});

export const GET = apiHandler({ paramsSchema }, async ({ params }) => {
  const ctx = await requirePropertyDeskAccess();
  const items = await listTasksForLead(ctx, params.id);
  return { data: items };
});

export const POST = apiHandler(
  { paramsSchema, bodySchema },
  async ({ params, body }) => {
    const ctx = await requirePropertyDeskAccess();
    const task = await createLeadTask(ctx, { leadId: params.id, ...body });
    return { data: task, status: 201 };
  },
);

/**
 * @swagger
 * /api/v1/platform/property-desk/leads/{id}/tasks:
 *   get:
 *     tags:
 *       - platform-property-desk
 *     summary: Lista taskova nad lead-om
 *     description: |
 *       **Auth:** `requirePropertyDeskAccess() + pd_lead_task.read + canViewMarketingLead(lead)`
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       "200":
 *         description: OK
 *   post:
 *     tags:
 *       - platform-property-desk
 *     summary: Kreiraj task nad lead-om
 *     description: |
 *       **Auth:** `requirePropertyDeskAccess() + pd_lead_task.create + canViewMarketingLead(lead)`.
 *       Ako se `assignedToUserId` razlikuje od pozivaoca, dodatno se traži `pd_lead_task.assign`.
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
 *       "201":
 *         description: Kreirano
 */
