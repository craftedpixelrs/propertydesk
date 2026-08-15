import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { requirePermission } from "@/server/permissions/require";
import {
  adjustCommission,
  approveCommission,
  cancelCommission,
  disputeCommission,
  markInvoiced,
  markPaid,
} from "@/server/services/commissions/lifecycle.service";

const paramsSchema = z.object({ id: z.string().min(1) });

const bodySchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("approve") }),
  z.object({
    action: z.literal("invoice"),
    invoiceNumber: z.string().max(200).nullable().optional(),
    dueDate: z.string().nullable().optional(),
  }),
  z.object({ action: z.literal("paid") }),
  z.object({ action: z.literal("cancel"), reason: z.string().min(1).max(500) }),
  z.object({ action: z.literal("dispute"), reason: z.string().min(1).max(500) }),
  z.object({
    action: z.literal("adjust"),
    amount: z.union([z.number().nonnegative(), z.string().min(1)]),
    reason: z.string().min(1).max(500),
  }),
]);

export const POST = apiHandler({ paramsSchema, bodySchema }, async ({ params, body }) => {
  const ctx = await requirePermission("commission.manage");
  const base = {
    investorOrganizationId: ctx.organization.organizationId,
    actorUserId: ctx.session.user.id,
    commissionId: params.id,
  };
  switch (body.action) {
    case "approve":
      return { data: await approveCommission(base) };
    case "invoice":
      return {
        data: await markInvoiced({
          ...base,
          invoiceNumber: body.invoiceNumber ?? null,
          dueDate: body.dueDate ? new Date(body.dueDate) : null,
        }),
      };
    case "paid":
      return { data: await markPaid(base) };
    case "cancel":
      return { data: await cancelCommission({ ...base, reason: body.reason }) };
    case "dispute":
      return { data: await disputeCommission({ ...base, reason: body.reason }) };
    case "adjust":
      return {
        data: await adjustCommission({
          ...base,
          newAmount: body.amount,
          reason: body.reason,
        }),
      };
  }
});

/**
 * @swagger
 * /api/v1/commissions/{id}/actions:
 *   post:
 *     tags:
 *       - commissions
 *     summary: Create commissions
 *     description: |
 *       **Auth:** `requirePermission("commission.manage")`
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
