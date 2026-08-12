import { z } from "zod";
import { apiHandler } from "@/lib/api/handler";
import { requireSuperAdmin } from "@/server/permissions/require";
import {
  deleteSaaSPlan,
  updateSaaSPlan,
} from "@/server/services/platform.service";

const paramsSchema = z.object({ id: z.string().min(1) });

const updateSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  description: z.string().max(500).optional().nullable(),
  monthlyPrice: z.number().min(0).optional(),
  quarterlyPrice: z.number().min(0).optional().nullable(),
  semiAnnualPrice: z.number().min(0).optional().nullable(),
  annualPrice: z.number().min(0).optional().nullable(),
  onboardingFee: z.number().min(0).optional().nullable(),
  currency: z.string().min(3).max(3).optional(),
  maxActiveProjects: z.number().int().min(0).optional().nullable(),
  maxUnits: z.number().int().min(0).optional().nullable(),
  maxMembers: z.number().int().min(0).optional().nullable(),
  maxAgencyConnections: z.number().int().min(0).optional().nullable(),
  features: z.record(z.string(), z.unknown()).optional(),
  active: z.boolean().optional(),
  publiclyAvailable: z.boolean().optional(),
  recommended: z.boolean().optional(),
  defaultTrialDays: z.number().int().min(0).max(365).optional().nullable(),
  sortOrder: z.number().int().optional(),
});

export const PATCH = apiHandler(
  { bodySchema: updateSchema, paramsSchema },
  async ({ body, params }) => {
    const ctx = await requireSuperAdmin();
    const plan = await updateSaaSPlan(params.id, body, ctx.session.user.id);
    return { data: plan };
  },
);

/**
 * DELETE /api/v1/platform/plans/{id}
 *
 * Hard-deletes a plan. The service refuses if any subscription or invoice
 * still references it. To remove a plan in production, use `archive`
 * (`POST .../archive`) instead — that keeps the historical link intact
 * while making it invisible for new sign-ups.
 */
export const DELETE = apiHandler({ paramsSchema }, async ({ params }) => {
  const ctx = await requireSuperAdmin();
  const result = await deleteSaaSPlan(params.id, ctx.session.user.id);
  return { data: result };
});

/**
 * @swagger
 * /api/v1/platform/plans/{id}:
 *   patch:
 *     tags:
 *       - platform
 *     summary: Update platform
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
 *   delete:
 *     tags:
 *       - platform
 *     summary: Delete platform
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
 */
