import { z } from "zod";
import type { SaleStatus } from "@prisma/client";

import { apiHandler } from "@/lib/api/handler";
import { paginate } from "@/lib/api/query";
import { requirePermission } from "@/server/permissions/require";
import { createSale, listSales } from "@/server/services/sales/sales.service";

const SALE_STATUSES = [
  "DRAFT",
  "PRE_CONTRACT",
  "CONTRACTED",
  "PAYMENT_IN_PROGRESS",
  "PAID",
  "HANDED_OVER",
  "CANCELED",
] as const;

const createSchema = z.object({
  unitId: z.string().min(1),
  buyerId: z.string().min(1),
  reservationId: z.string().min(1).optional(),
  responsibleUserId: z.string().min(1).optional(),
  listPrice: z.union([z.number().positive(), z.string().min(1)]),
  discountType: z.enum(["PERCENTAGE", "FIXED"]).nullable().optional(),
  discountValue: z.union([z.number(), z.string()]).nullable().optional(),
  currency: z.string().length(3).optional(),
  depositAmount: z.union([z.number(), z.string()]).nullable().optional(),
  notes: z.string().max(2000).optional(),
});

function parseStatuses(raw: string | null): SaleStatus[] | undefined {
  if (!raw) return undefined;
  const values = raw
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter((v): v is SaleStatus => (SALE_STATUSES as readonly string[]).includes(v));
  return values.length > 0 ? values : undefined;
}

export const GET = apiHandler({}, async ({ query, searchParams }) => {
  const ctx = await requirePermission("sale.read");
  const { items, total } = await listSales({
    organizationId: ctx.organization.organizationId,
    page: query.page,
    pageSize: query.pageSize,
    status: parseStatuses(searchParams.get("status")),
    projectId: searchParams.get("projectId") ?? undefined,
    buyerId: searchParams.get("buyerId") ?? undefined,
    unitId: searchParams.get("unitId") ?? undefined,
  });
  const { items: pageItems, pagination } = paginate(items, query.page, query.pageSize, total);
  return { data: pageItems, meta: { pagination } };
});

export const POST = apiHandler({ bodySchema: createSchema }, async ({ body }) => {
  const ctx = await requirePermission("sale.manage");
  const sale = await createSale({
    organizationId: ctx.organization.organizationId,
    actorUserId: ctx.session.user.id,
    unitId: body.unitId,
    buyerId: body.buyerId,
    reservationId: body.reservationId,
    responsibleUserId: body.responsibleUserId ?? null,
    listPrice: body.listPrice,
    discountType: body.discountType ?? null,
    discountValue: body.discountValue ?? null,
    currency: body.currency,
    depositAmount: body.depositAmount ?? null,
    notes: body.notes ?? null,
  });
  return { data: sale, status: 201 };
});

/**
 * @swagger
 * /api/v1/sales:
 *   get:
 *     tags:
 *       - sales
 *     summary: List / read sales
 *     description: |
 *       **Auth:** `requirePermission("sale.read")`
 *     responses:
 *       "200":
 *         description: |
 *           OK
 *       "401":
 *         $ref: "#/components/responses/Unauthenticated"
 *       "403":
 *         $ref: "#/components/responses/Forbidden"
 *   post:
 *     tags:
 *       - sales
 *     summary: Create sales
 *     description: |
 *       **Auth:** `requirePermission("sale.manage") + requirePermission("sale.read")`
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
