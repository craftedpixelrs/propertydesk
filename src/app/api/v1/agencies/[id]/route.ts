import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { requirePermission } from "@/server/permissions/require";
import {
  getConnectionDetail,
  setProtectionDays,
} from "@/server/services/agencies/agencies.service";

const paramsSchema = z.object({ id: z.string().min(1) });
const patchSchema = z.object({
  defaultProtectionDays: z.number().int().min(0).max(365).optional(),
});

export const GET = apiHandler({ paramsSchema }, async ({ params }) => {
  const ctx = await requirePermission("agency.read");
  const detail = await getConnectionDetail(ctx.organization.organizationId, params.id);
  return { data: detail };
});

export const PATCH = apiHandler(
  { paramsSchema, bodySchema: patchSchema },
  async ({ params, body }) => {
    const ctx = await requirePermission("agency.manage");
    if (body.defaultProtectionDays !== undefined) {
      const updated = await setProtectionDays({
        investorOrganizationId: ctx.organization.organizationId,
        actorUserId: ctx.session.user.id,
        connectionId: params.id,
        days: body.defaultProtectionDays,
      });
      return { data: updated };
    }
    const detail = await getConnectionDetail(ctx.organization.organizationId, params.id);
    return { data: detail };
  },
);

/**
 * @swagger
 * /api/v1/agencies/{id}:
 *   get:
 *     tags:
 *       - agencies
 *     summary: List / read agencies
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
 *   patch:
 *     tags:
 *       - agencies
 *     summary: Update agencies
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
