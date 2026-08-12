import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { requirePermission } from "@/server/permissions/require";
import {
  deleteTemplate,
  getTemplate,
  updateTemplate,
} from "@/server/services/sales/payment-plan-templates.service";

const paramsSchema = z.object({ id: z.string().min(1) });

const itemSchema = z.object({
  label: z.string().min(1).max(200),
  percentage: z.union([z.number().positive(), z.string().min(1)]),
  dueDateAnchor: z.enum(["CONTRACT", "HANDOVER", "CUSTOM_OFFSET"]),
  offsetDays: z.number().int(),
});

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional().nullable(),
  projectId: z.string().min(1).optional().nullable(),
  isDefault: z.boolean().optional(),
  items: z.array(itemSchema).min(1).optional(),
});

export const GET = apiHandler({ paramsSchema }, async ({ params }) => {
  const ctx = await requirePermission("payment.manage");
  const tmpl = await getTemplate({
    organizationId: ctx.organization.organizationId,
    templateId: params.id,
  });
  return { data: tmpl };
});

export const PATCH = apiHandler(
  { paramsSchema, bodySchema: updateSchema },
  async ({ params, body }) => {
    const ctx = await requirePermission("payment.manage");
    const updated = await updateTemplate({
      organizationId: ctx.organization.organizationId,
      actorUserId: ctx.session.user.id,
      templateId: params.id,
      name: body.name,
      description: body.description,
      projectId: body.projectId,
      isDefault: body.isDefault,
      items: body.items,
    });
    return { data: updated };
  },
);

export const DELETE = apiHandler({ paramsSchema }, async ({ params }) => {
  const ctx = await requirePermission("payment.manage");
  await deleteTemplate({
    organizationId: ctx.organization.organizationId,
    actorUserId: ctx.session.user.id,
    templateId: params.id,
  });
  return { data: { id: params.id } };
});

/**
 * @swagger
 * /api/v1/payment-plan-templates/{id}:
 *   get:
 *     tags:
 *       - payment-plan-templates
 *     summary: List / read payment-plan-templates
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
 *       - payment-plan-templates
 *     summary: Update payment-plan-templates
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
 *       - payment-plan-templates
 *     summary: Delete payment-plan-templates
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
