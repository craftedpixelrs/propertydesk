import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { requirePermission } from "@/server/permissions/require";
import { updateTask } from "@/server/services/tasks.service";

const paramsSchema = z.object({ id: z.string().min(1) });

const patchSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  assignedUserId: z.string().min(1).optional(),
  dueAt: z.string().datetime().optional(),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).optional(),
  status: z.enum(["OPEN", "IN_PROGRESS", "COMPLETED", "CANCELED"]).optional(),
});

export const PATCH = apiHandler({ paramsSchema, bodySchema: patchSchema }, async ({ params, body }) => {
  const ctx = await requirePermission("lead.manage");
  const updated = await updateTask({
    organizationId: ctx.organization.organizationId,
    actorUserId: ctx.session.user.id,
    taskId: params.id,
    patch: {
      title: body.title,
      description: body.description,
      assignedUserId: body.assignedUserId,
      dueAt: body.dueAt ? new Date(body.dueAt) : undefined,
      priority: body.priority,
      status: body.status,
    },
  });
  return { data: updated };
});

/**
 * @swagger
 * /api/v1/tasks/{id}:
 *   patch:
 *     tags:
 *       - tasks
 *     summary: Update tasks
 *     description: |
 *       **Auth:** `requirePermission("lead.manage")`
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
