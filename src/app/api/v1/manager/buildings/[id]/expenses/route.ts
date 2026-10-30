import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { prisma } from "@/server/db/prisma";
import { requirePermission } from "@/server/permissions/require";
import {
  createBuildingExpense,
  expenseSummaryByFund,
} from "@/server/services/manager/maintenance.service";
import { assertBuildingBelongsToOrg } from "@/server/services/manager/buildings.service";

const paramsSchema = z.object({ id: z.string().min(1) });

const FUND = z.enum(["CURRENT_MAINTENANCE", "INVESTMENT_FUND", "OTHER"]);

const createSchema = z.object({
  fund: FUND,
  description: z.string().trim().min(2).max(500),
  amount: z.coerce.number().positive(),
  spentAt: z.coerce.date(),
  supplierId: z.string().min(1).nullable().optional(),
});

export const GET = apiHandler({ paramsSchema }, async ({ params, searchParams }) => {
  const ctx = await requirePermission("building.read");
  await assertBuildingBelongsToOrg(ctx.organization.organizationId, params.id);

  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const [rows, summary] = await Promise.all([
    prisma.buildingExpense.findMany({
      where: {
        organizationId: ctx.organization.organizationId,
        buildingId: params.id,
        ...(from || to
          ? {
              spentAt: {
                ...(from ? { gte: new Date(from) } : {}),
                ...(to ? { lte: new Date(to) } : {}),
              },
            }
          : {}),
      },
      include: {
        supplier: { select: { id: true, name: true } },
      },
      orderBy: { spentAt: "desc" },
      take: 200,
    }),
    expenseSummaryByFund({
      organizationId: ctx.organization.organizationId,
      buildingId: params.id,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
    }),
  ]);
  return { data: { rows, summary } };
});

export const POST = apiHandler(
  { paramsSchema, bodySchema: createSchema },
  async ({ params, body }) => {
    const ctx = await requirePermission("building.manage");
    const row = await createBuildingExpense({
      organizationId: ctx.organization.organizationId,
      actorUserId: ctx.session.user.id,
      buildingId: params.id,
      ...body,
    });
    return { data: row, status: 201 };
  },
);

/**
 * @swagger
 * /api/v1/manager/buildings/{id}/expenses:
 *   get:
 *     tags: [manager]
 *     summary: List building expenses and per-fund summary
 *     description: |
 *       **Auth:** `requirePermission("building.read")`
 *   post:
 *     tags: [manager]
 *     summary: Create a building expense (per fund)
 *     description: |
 *       **Auth:** `requirePermission("building.manage")`
 */
