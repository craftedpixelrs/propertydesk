import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { requirePermission } from "@/server/permissions/require";
import {
  deleteCommissionRule,
  updateCommissionRule,
} from "@/server/services/commissions/rules.service";

const paramsSchema = z.object({ id: z.string().min(1) });
const patchSchema = z.object({
  agencyConnectionId: z.string().min(1).nullable().optional(),
  projectId: z.string().min(1).nullable().optional(),
  unitId: z.string().min(1).nullable().optional(),
  calculationType: z.enum(["PERCENTAGE", "FIXED"]).optional(),
  rate: z.number().min(0).max(100).nullable().optional(),
  fixedAmount: z.number().nonnegative().nullable().optional(),
  currency: z.string().length(3).optional(),
  validFrom: z.string().datetime().nullable().optional(),
  validTo: z.string().datetime().nullable().optional(),
  internalNote: z.string().max(2000).nullable().optional(),
  agencyVisibleNote: z.string().max(2000).nullable().optional(),
});

export const PATCH = apiHandler(
  { paramsSchema, bodySchema: patchSchema },
  async ({ params, body }) => {
    const ctx = await requirePermission("commission.manage");
    const updated = await updateCommissionRule({
      investorOrganizationId: ctx.organization.organizationId,
      actorUserId: ctx.session.user.id,
      ruleId: params.id,
      patch: {
        agencyConnectionId: body.agencyConnectionId ?? undefined,
        projectId: body.projectId ?? undefined,
        unitId: body.unitId ?? undefined,
        calculationType: body.calculationType,
        rate: body.rate ?? undefined,
        fixedAmount: body.fixedAmount ?? undefined,
        currency: body.currency,
        validFrom: body.validFrom ? new Date(body.validFrom) : body.validFrom === null ? null : undefined,
        validTo: body.validTo ? new Date(body.validTo) : body.validTo === null ? null : undefined,
        internalNote: body.internalNote ?? undefined,
        agencyVisibleNote: body.agencyVisibleNote ?? undefined,
      },
    });
    return { data: updated };
  },
);

export const DELETE = apiHandler({ paramsSchema }, async ({ params }) => {
  const ctx = await requirePermission("commission.manage");
  await deleteCommissionRule({
    investorOrganizationId: ctx.organization.organizationId,
    actorUserId: ctx.session.user.id,
    ruleId: params.id,
  });
  return { data: { ok: true } };
});

/**
 * @swagger
 * /api/v1/commission-rules/{id}:
 *   patch:
 *     tags:
 *       - commission-rules
 *     summary: Update commission-rules
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
 *       - commission-rules
 *     summary: Delete commission-rules
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
