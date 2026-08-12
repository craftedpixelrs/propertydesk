import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { requirePermission } from "@/server/permissions/require";
import { changeUnitStatus } from "@/server/services/units.service";

const paramsSchema = z.object({ id: z.string().min(1) });

const bodySchema = z.object({
  newStatus: z.enum([
    "AVAILABLE",
    "ON_HOLD",
    "RESERVED",
    "DEPOSIT_PAID",
    "CONTRACTED",
    "SOLD",
    "BLOCKED",
    "NOT_FOR_SALE",
  ]),
  reason: z.string().max(500).optional(),
});

export const POST = apiHandler(
  { bodySchema, paramsSchema },
  async ({ params, body }) => {
    const ctx = await requirePermission("inventory.status");
    const updated = await changeUnitStatus({
      organizationId: ctx.organization.organizationId,
      actorUserId: ctx.session.user.id,
      unitId: params.id,
      newStatus: body.newStatus,
      reason: body.reason,
      allowOverride: ctx.isSuperAdmin,
    });
    return { data: updated };
  },
);

/**
 * @swagger
 * /api/v1/units/{id}/status:
 *   post:
 *     tags:
 *       - units
 *     summary: Create units
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
 */
