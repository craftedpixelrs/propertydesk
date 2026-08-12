import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { requirePermission } from "@/server/permissions/require";
import { completeTask } from "@/server/services/tasks.service";

const paramsSchema = z.object({ id: z.string().min(1) });

export const POST = apiHandler({ paramsSchema }, async ({ params }) => {
  const ctx = await requirePermission("lead.manage");
  const updated = await completeTask({
    organizationId: ctx.organization.organizationId,
    actorUserId: ctx.session.user.id,
    taskId: params.id,
  });
  return { data: updated };
});

/**
 * @swagger
 * /api/v1/tasks/{id}/complete:
 *   post:
 *     tags:
 *       - tasks
 *     summary: Create tasks
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
