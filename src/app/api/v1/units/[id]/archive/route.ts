import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { requirePermission } from "@/server/permissions/require";
import { archiveUnit, restoreUnit } from "@/server/services/units.service";

const paramsSchema = z.object({ id: z.string().min(1) });
const bodySchema = z.object({ action: z.enum(["archive", "restore"]) });

export const POST = apiHandler(
  { bodySchema, paramsSchema },
  async ({ params, body }) => {
    const ctx = await requirePermission("inventory.manage");
    if (body.action === "archive") {
      await archiveUnit({
        organizationId: ctx.organization.organizationId,
        actorUserId: ctx.session.user.id,
        unitId: params.id,
      });
    } else {
      await restoreUnit({
        organizationId: ctx.organization.organizationId,
        actorUserId: ctx.session.user.id,
        unitId: params.id,
      });
    }
    return { data: { ok: true } };
  },
);

/**
 * @swagger
 * /api/v1/units/{id}/archive:
 *   post:
 *     tags:
 *       - units
 *     summary: Create units
 *     description: |
 *       **Auth:** `requirePermission("inventory.manage")`
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
