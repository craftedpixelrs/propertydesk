import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { requirePermission } from "@/server/permissions/require";
import { createEntrance } from "@/server/services/structure.service";

const paramsSchema = z.object({ id: z.string().min(1) });
const bodySchema = z.object({
  code: z.string().min(1).max(20),
  name: z.string().min(1).max(120),
  sortOrder: z.number().int().min(0).optional(),
});

export const POST = apiHandler(
  { paramsSchema, bodySchema },
  async ({ params, body }) => {
    const ctx = await requirePermission("inventory.manage");
    const e = await createEntrance({
      organizationId: ctx.organization.organizationId,
      actorUserId: ctx.session.user.id,
      buildingId: params.id,
      ...body,
    });
    return { data: e, status: 201 };
  },
);

/**
 * @swagger
 * /api/v1/buildings/{id}/entrances:
 *   post:
 *     tags:
 *       - buildings
 *     summary: Create buildings
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
