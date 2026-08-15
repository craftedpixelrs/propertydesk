import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { requirePropertyDeskAccess } from "@/server/permissions/property-desk";
import { bulkUpdateMarketingLeads } from "@/server/services/property-desk/marketing-leads.service";

const stageSchema = z.enum([
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "DEMO",
  "PROPOSAL",
  "WON",
  "LOST",
  "NURTURING",
]);

const bodySchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(200),
  action: z.discriminatedUnion("kind", [
    z.object({
      kind: z.literal("assign"),
      assignedToUserId: z.string().min(1).nullable(),
    }),
    z.object({
      kind: z.literal("stage"),
      stage: stageSchema,
    }),
    z.object({
      kind: z.literal("lost"),
      reason: z.string().trim().max(1000).nullable().optional(),
    }),
  ]),
});

export const POST = apiHandler({ bodySchema }, async ({ body }) => {
  const ctx = await requirePropertyDeskAccess();
  const result = await bulkUpdateMarketingLeads(
    ctx,
    body,
    ctx.session.user.id,
  );
  return { data: result };
});

/**
 * @swagger
 * /api/v1/platform/property-desk/leads/bulk:
 *   post:
 *     tags:
 *       - platform-property-desk
 *     summary: Bulk operacije nad marketing lead-ovima
 *     description: |
 *       **Auth:** `requirePropertyDeskAccess() + pd_lead.bulk`; dodatno:
 *       - `assign` traži `pd_lead.reassign`
 *       - `stage` i `lost` traže `pd_lead.update_stage`
 *
 *       Lead-ovi van vidljivog `leadScope` pozivaoca se preskaču (`skipped`).
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
 *       "401":
 *         $ref: "#/components/responses/Unauthenticated"
 *       "403":
 *         $ref: "#/components/responses/Forbidden"
 */
