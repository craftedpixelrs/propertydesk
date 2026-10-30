import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { requirePermission } from "@/server/permissions/require";
import { createDuesTariff, listDuesTariffs } from "@/server/services/manager/dues.service";

const paramsSchema = z.object({ id: z.string().min(1) });

const createSchema = z.object({
  name: z.string().trim().min(1).max(120),
  kind: z.enum(["CURRENT_MAINTENANCE", "INVESTMENT_FUND", "MANAGER_FEE", "INSURANCE", "OTHER"]),
  basis: z.enum(["PER_UNIT", "PER_SQUARE_METER"]),
  amount: z.coerce.number().positive(),
  currency: z.string().length(3).optional(),
  unitTypeFilter: z
    .enum(["APARTMENT", "COMMERCIAL", "GARAGE", "PARKING_SPACE", "STORAGE", "OFFICE", "OTHER"])
    .nullable()
    .optional(),
  effectiveFrom: z.coerce.date(),
  effectiveTo: z.coerce.date().nullable().optional(),
  notes: z.string().max(1000).optional(),
});

export const GET = apiHandler({ paramsSchema }, async ({ params }) => {
  const ctx = await requirePermission("dues.read");
  const rows = await listDuesTariffs(ctx.organization.organizationId, params.id);
  return { data: rows };
});

export const POST = apiHandler(
  { paramsSchema, bodySchema: createSchema },
  async ({ params, body }) => {
    const ctx = await requirePermission("dues.tariff.manage");
    const row = await createDuesTariff({
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
 * /api/v1/manager/buildings/{id}/tariffs:
 *   get:
 *     tags: [manager]
 *     summary: List dues tariffs for a building
 *     description: |
 *       **Auth:** `requirePermission("dues.read")`
 *   post:
 *     tags: [manager]
 *     summary: Create a dues tariff
 *     description: |
 *       **Auth:** `requirePermission("dues.tariff.manage")`
 */
