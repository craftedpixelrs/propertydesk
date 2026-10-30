import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { requirePermission } from "@/server/permissions/require";
import { updateDuesTariff } from "@/server/services/manager/dues.service";

const paramsSchema = z.object({ id: z.string().min(1) });

const patchSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  kind: z
    .enum(["CURRENT_MAINTENANCE", "INVESTMENT_FUND", "MANAGER_FEE", "INSURANCE", "OTHER"])
    .optional(),
  basis: z.enum(["PER_UNIT", "PER_SQUARE_METER"]).optional(),
  amount: z.coerce.number().positive().optional(),
  currency: z.string().length(3).optional(),
  unitTypeFilter: z
    .enum(["APARTMENT", "COMMERCIAL", "GARAGE", "PARKING_SPACE", "STORAGE", "OFFICE", "OTHER"])
    .nullable()
    .optional(),
  effectiveFrom: z.coerce.date().optional(),
  effectiveTo: z.coerce.date().nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
  active: z.boolean().optional(),
});

export const PATCH = apiHandler(
  { paramsSchema, bodySchema: patchSchema },
  async ({ params, body }) => {
    const ctx = await requirePermission("dues.tariff.manage");
    const { active, ...patch } = body;
    const row = await updateDuesTariff({
      organizationId: ctx.organization.organizationId,
      actorUserId: ctx.session.user.id,
      tariffId: params.id,
      patch,
      active,
    });
    return { data: row };
  },
);

/**
 * @swagger
 * /api/v1/manager/tariffs/{id}:
 *   patch:
 *     tags: [manager]
 *     summary: Update or deactivate a dues tariff
 *     description: |
 *       **Auth:** `requirePermission("dues.tariff.manage")`
 */
