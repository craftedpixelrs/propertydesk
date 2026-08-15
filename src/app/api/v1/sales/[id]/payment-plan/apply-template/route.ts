import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { requirePermission } from "@/server/permissions/require";
import { applyTemplateToDraft } from "@/server/services/sales/payment-plan-templates.service";

const paramsSchema = z.object({ id: z.string().min(1) });
const bodySchema = z.object({ templateId: z.string().min(1) });

/**
 * Resolve a template against this specific sale and return the draft
 * rows a PaymentPlanForm can load. Does NOT persist a plan — the
 * client still submits `POST /sales/[id]/payment-plan` with the
 * MANUAL body once the operator is happy with the amounts and dates.
 */
export const POST = apiHandler(
  { paramsSchema, bodySchema },
  async ({ params, body }) => {
    const ctx = await requirePermission("payment.manage");
    const draft = await applyTemplateToDraft({
      organizationId: ctx.organization.organizationId,
      saleId: params.id,
      templateId: body.templateId,
    });
    return { data: draft };
  },
);

/**
 * @swagger
 * /api/v1/sales/{id}/payment-plan/apply-template:
 *   post:
 *     tags:
 *       - sales
 *     summary: Create sales
 *     description: |
 *       **Auth:** `requirePermission("payment.manage")`
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
 *         description: |
 *           OK
 *       "401":
 *         $ref: "#/components/responses/Unauthenticated"
 *       "403":
 *         $ref: "#/components/responses/Forbidden"
 */
