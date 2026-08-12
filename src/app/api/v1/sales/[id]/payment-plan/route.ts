import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { requirePermission } from "@/server/permissions/require";
import {
  cancelPaymentPlan,
  createPaymentPlan,
  getPaymentPlan,
} from "@/server/services/sales/payment-plans.service";
import { prisma } from "@/server/db/prisma";
import { DomainErrors } from "@/lib/errors";

const paramsSchema = z.object({ id: z.string().min(1) });

const manualInstallmentSchema = z.object({
  name: z.string().min(1),
  amount: z.union([z.number().positive(), z.string()]),
  dueDate: z.string(),
  notes: z.string().max(500).optional().nullable(),
});
const percentageInstallmentSchema = z.object({
  name: z.string().min(1),
  percentage: z.union([z.number().positive(), z.string()]),
  dueDate: z.string(),
  notes: z.string().max(500).optional().nullable(),
});
const equalSchema = z.object({
  installments: z.number().int().positive(),
  firstDueDate: z.string(),
  monthlyGap: z.number().int().positive().optional(),
  namePrefix: z.string().min(1).optional(),
});

const createSchema = z
  .object({
    planName: z.string().min(1).max(200),
    template: z.enum(["MANUAL", "PERCENTAGE", "EQUAL"]),
    manual: z.array(manualInstallmentSchema).optional(),
    percentage: z.array(percentageInstallmentSchema).optional(),
    equal: equalSchema.optional(),
  })
  .refine(
    (v) =>
      (v.template === "MANUAL" && v.manual?.length) ||
      (v.template === "PERCENTAGE" && v.percentage?.length) ||
      (v.template === "EQUAL" && v.equal),
    { message: "Podaci o plaćanju ne odgovaraju izabranom šablonu." },
  );

async function loadSaleAndPlan(organizationId: string, saleId: string) {
  const sale = await prisma.sale.findFirst({
    where: { id: saleId, organizationId },
    select: { id: true, paymentPlan: { select: { id: true } } },
  });
  if (!sale) throw DomainErrors.notFound("Prodaja");
  return sale;
}

export const GET = apiHandler({ paramsSchema }, async ({ params }) => {
  const ctx = await requirePermission("sale.read");
  const sale = await loadSaleAndPlan(ctx.organization.organizationId, params.id);
  if (!sale.paymentPlan) return { data: null };
  const plan = await getPaymentPlan({
    organizationId: ctx.organization.organizationId,
    planId: sale.paymentPlan.id,
  });
  return { data: plan };
});

export const POST = apiHandler(
  { paramsSchema, bodySchema: createSchema },
  async ({ params, body }) => {
    const ctx = await requirePermission("payment.manage");
    const plan = await createPaymentPlan({
      organizationId: ctx.organization.organizationId,
      actorUserId: ctx.session.user.id,
      saleId: params.id,
      planName: body.planName,
      template: body.template,
      manual: body.manual,
      percentage: body.percentage,
      equal: body.equal,
    });
    return { data: plan, status: 201 };
  },
);

const cancelSchema = z.object({ reason: z.string().min(1).max(500) });
export const DELETE = apiHandler({ paramsSchema }, async ({ params, req }) => {
  const ctx = await requirePermission("payment.manage");
  const sale = await loadSaleAndPlan(ctx.organization.organizationId, params.id);
  if (!sale.paymentPlan) throw DomainErrors.notFound("Plan plaćanja");
  const raw = await req.json().catch(() => ({}));
  const body = cancelSchema.parse(raw);
  const canceled = await cancelPaymentPlan({
    organizationId: ctx.organization.organizationId,
    actorUserId: ctx.session.user.id,
    planId: sale.paymentPlan.id,
    reason: body.reason,
  });
  return { data: canceled };
});

/**
 * @swagger
 * /api/v1/sales/{id}/payment-plan:
 *   get:
 *     tags:
 *       - sales
 *     summary: List / read sales
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
 *   post:
 *     tags:
 *       - sales
 *     summary: Create sales
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
 *       - sales
 *     summary: Delete sales
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
