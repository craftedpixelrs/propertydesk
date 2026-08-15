import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { requirePropertyDeskAccess } from "@/server/permissions/property-desk";
import {
  listLeadActivities,
  recordManualActivity,
} from "@/server/services/property-desk/marketing-lead-activities.service";

const paramsSchema = z.object({ id: z.string().min(1) });

const bodySchema = z.object({
  kind: z.enum(["CALL", "EMAIL", "MEETING", "NOTE"]),
  title: z.string().trim().min(1).max(200),
  body: z.string().trim().max(4000).nullable().optional(),
  occurredAt: z
    .string()
    .datetime()
    .optional()
    .transform((v) => (v ? new Date(v) : undefined)),
});

export const GET = apiHandler({ paramsSchema }, async ({ params }) => {
  const ctx = await requirePropertyDeskAccess();
  const items = await listLeadActivities(ctx, params.id);
  return { data: items };
});

export const POST = apiHandler(
  { paramsSchema, bodySchema },
  async ({ params, body }) => {
    const ctx = await requirePropertyDeskAccess();
    const activity = await recordManualActivity(ctx, params.id, body);
    return { data: activity, status: 201 };
  },
);

/**
 * @swagger
 * /api/v1/platform/property-desk/leads/{id}/activities:
 *   get:
 *     tags:
 *       - platform-property-desk
 *     summary: Timeline aktivnosti marketing lead-a
 *     description: |
 *       **Auth:** `requirePropertyDeskAccess() + pd_lead_activity.read`
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
 *     summary: Ručno dodaj aktivnost (poziv/email/meeting/note)
 *     description: |
 *       **Auth:** `requirePropertyDeskAccess() + pd_lead_activity.create + canViewMarketingLead(lead)`
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
