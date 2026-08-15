import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { requirePermission } from "@/server/permissions/require";
import { updateSaleTaxSettings } from "@/server/services/sales/sales.service";

const paramsSchema = z.object({ id: z.string().min(1) });

const bodySchema = z.object({
  vatMode: z
    .enum(["NEW_BUILD_10", "SECONDARY_MARKET_2_5", "NONE"])
    .nullable(),
  taxPayer: z.enum(["BUYER", "SELLER"]).nullable().optional(),
  // When present, the operator wants to override the auto-derived tax
  // amount (e.g. a rounding tweak or a negotiated flat fee). When null,
  // the service recomputes it from `finalPrice` + `vatMode`.
  taxAmount: z
    .union([z.number(), z.string(), z.null()])
    .optional(),
});

export const PATCH = apiHandler(
  { paramsSchema, bodySchema },
  async ({ params, body }) => {
    const ctx = await requirePermission("sale.manage");
    const data = await updateSaleTaxSettings({
      organizationId: ctx.organization.organizationId,
      actorUserId: ctx.session.user.id,
      saleId: params.id,
      vatMode: body.vatMode,
      taxPayer: body.taxPayer ?? undefined,
      taxAmount: body.taxAmount ?? undefined,
    });
    return { data };
  },
);

/**
 * @swagger
 * /api/v1/sales/{id}/tax:
 *   patch:
 *     tags:
 *       - sales
 *     summary: Update sales
 *     description: |
 *       **Auth:** `requirePermission("sale.manage")`
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
