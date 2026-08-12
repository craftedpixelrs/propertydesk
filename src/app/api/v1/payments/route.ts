import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { paginate } from "@/lib/api/query";
import { requirePermission } from "@/server/permissions/require";
import { listPayments, recordPayment } from "@/server/services/sales/payments.service";

const createSchema = z.object({
  saleId: z.string().min(1),
  installmentId: z.string().min(1).optional(),
  amount: z.union([z.number().positive(), z.string().min(1)]),
  paymentDate: z.string(),
  paymentMethod: z.enum([
    "BANK_TRANSFER",
    "CASH",
    "CARD",
    "LOAN",
    "COMPENSATION",
    "OTHER",
  ]),
  referenceNumber: z.string().max(200).optional().nullable(),
  note: z.string().max(1000).optional().nullable(),
  proofDocumentId: z.string().min(1).optional().nullable(),
});

export const GET = apiHandler({}, async ({ query, searchParams }) => {
  const ctx = await requirePermission("payment.read");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const { items, total } = await listPayments({
    organizationId: ctx.organization.organizationId,
    page: query.page,
    pageSize: query.pageSize,
    saleId: searchParams.get("saleId") ?? undefined,
    from: from ? new Date(from) : undefined,
    to: to ? new Date(to) : undefined,
  });
  const { items: pageItems, pagination } = paginate(items, query.page, query.pageSize, total);
  return { data: pageItems, meta: { pagination } };
});

export const POST = apiHandler({ bodySchema: createSchema }, async ({ body }) => {
  const ctx = await requirePermission("payment.manage");
  const payment = await recordPayment({
    organizationId: ctx.organization.organizationId,
    actorUserId: ctx.session.user.id,
    saleId: body.saleId,
    installmentId: body.installmentId ?? null,
    amount: body.amount,
    paymentDate: body.paymentDate,
    paymentMethod: body.paymentMethod,
    referenceNumber: body.referenceNumber ?? null,
    note: body.note ?? null,
    proofDocumentId: body.proofDocumentId ?? null,
  });
  return { data: payment, status: 201 };
});

/**
 * @swagger
 * /api/v1/payments:
 *   get:
 *     tags:
 *       - payments
 *     summary: List / read payments
 *     responses:
 *       "200":
 *         description: OK
 *       "401":
 *         $ref: "#/components/responses/Unauthenticated"
 *       "403":
 *         $ref: "#/components/responses/Forbidden"
 *   post:
 *     tags:
 *       - payments
 *     summary: Create payments
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
