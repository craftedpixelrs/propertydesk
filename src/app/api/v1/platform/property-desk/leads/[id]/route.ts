import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { requirePropertyDeskAccess } from "@/server/permissions/property-desk";
import {
  getMarketingLead,
  updateMarketingLead,
} from "@/server/services/property-desk/marketing-leads.service";

const paramsSchema = z.object({ id: z.string().min(1) });

const patchBody = z.object({
  stage: z
    .enum([
      "NEW",
      "CONTACTED",
      "QUALIFIED",
      "DEMO",
      "PROPOSAL",
      "WON",
      "LOST",
      "NURTURING",
    ])
    .optional(),
  assignedToUserId: z.string().nullable().optional(),
  reopenReason: z.string().trim().max(500).nullable().optional(),
  note: z.string().max(4000).nullable().optional(),
  lostReason: z.string().max(1000).nullable().optional(),
  audience: z.enum(["INVESTOR", "AGENCY", "OTHER"]).optional(),
  city: z.string().max(120).nullable().optional(),
  firstName: z.string().max(120).nullable().optional(),
  lastName: z.string().max(120).nullable().optional(),
  phone: z.string().max(40).nullable().optional(),
  // Classification
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).optional(),
  temperature: z.enum(["COLD", "WARM", "HOT"]).optional(),
  timelineHorizon: z
    .enum(["WITHIN_30D", "WITHIN_90D", "LATER", "UNDECIDED"])
    .optional(),
  nextFollowUpAt: z.coerce.date().nullable().optional(),
  // Company
  companyName: z.string().max(200).nullable().optional(),
  companyWebsite: z.string().max(300).nullable().optional(),
  companySize: z.coerce.number().int().min(0).max(1000000).nullable().optional(),
  budgetTier: z
    .enum(["STARTER", "GROWTH", "ENTERPRISE", "UNKNOWN"])
    .optional(),
  budgetCurrency: z.string().max(10).nullable().optional(),
  // Decision maker & channel
  decisionMakerName: z.string().max(200).nullable().optional(),
  decisionMakerTitle: z.string().max(200).nullable().optional(),
  preferredContact: z
    .enum(["PHONE", "EMAIL", "WHATSAPP", "VIBER", "OTHER"])
    .nullable()
    .optional(),
  bestContactHour: z.string().max(80).nullable().optional(),
  preferredLanguage: z.string().max(10).nullable().optional(),
  // Qualification
  competitor: z.string().max(200).nullable().optional(),
  painPoint: z.string().max(2000).nullable().optional(),
  // Geo
  country: z.string().max(10).nullable().optional(),
  region: z.string().max(200).nullable().optional(),
  // Source (overrideable on details)
  source: z.string().max(80).nullable().optional(),
});

export const GET = apiHandler({ paramsSchema }, async ({ params }) => {
  const ctx = await requirePropertyDeskAccess();
  const lead = await getMarketingLead(ctx, params.id);
  return { data: lead };
});

export const PATCH = apiHandler(
  { paramsSchema, bodySchema: patchBody },
  async ({ params, body }) => {
    const ctx = await requirePropertyDeskAccess();
    const lead = await updateMarketingLead(
      ctx,
      params.id,
      body,
      ctx.session.user.id,
    );
    return { data: lead };
  },
);

/**
 * @swagger
 * /api/v1/platform/property-desk/leads/{id}:
 *   get:
 *     tags:
 *       - platform-property-desk
 *     summary: Detalj marketing lead-a
 *     description: |
 *       **Auth:** `requirePropertyDeskAccess() + canViewMarketingLead(lead)`
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       "200":
 *         description: OK
 *       "401":
 *         $ref: "#/components/responses/Unauthenticated"
 *       "403":
 *         $ref: "#/components/responses/Forbidden"
 *   patch:
 *     tags:
 *       - platform-property-desk
 *     summary: Ažuriraj stage / assign / notes marketing lead-a
 *     description: |
 *       **Auth:** `requirePropertyDeskAccess() + canViewMarketingLead(lead)`
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
 *       "401":
 *         $ref: "#/components/responses/Unauthenticated"
 *       "403":
 *         $ref: "#/components/responses/Forbidden"
 */
