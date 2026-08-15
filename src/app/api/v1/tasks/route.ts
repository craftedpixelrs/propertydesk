import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { paginate } from "@/lib/api/query";
import { requirePermission } from "@/server/permissions/require";
import {
  createTask,
  getTaskViewCounts,
  listTasks,
  type TaskView,
} from "@/server/services/tasks.service";

const TASK_VIEWS = ["mine", "today", "overdue", "upcoming", "all"] as const;
const TASK_STATUSES = ["OPEN", "IN_PROGRESS", "COMPLETED", "CANCELED"] as const;

const createSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  assignedUserId: z.string().min(1).optional(),
  buyerId: z.string().min(1).optional(),
  projectId: z.string().min(1).optional(),
  unitId: z.string().min(1).optional(),
  dueAt: z.string().datetime(),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).optional(),
});

function parseView(raw: string | null): TaskView {
  if (raw && (TASK_VIEWS as readonly string[]).includes(raw)) return raw as TaskView;
  return "mine";
}

export const GET = apiHandler({}, async ({ query, searchParams }) => {
  const ctx = await requirePermission("lead.read");
  const view = parseView(searchParams.get("view"));
  const [{ items, total }, counts] = await Promise.all([
    listTasks({
      organizationId: ctx.organization.organizationId,
      currentUserId: ctx.session.user.id,
      view,
      page: query.page,
      pageSize: query.pageSize,
      buyerId: searchParams.get("buyerId") ?? undefined,
    }),
    getTaskViewCounts({
      organizationId: ctx.organization.organizationId,
      currentUserId: ctx.session.user.id,
    }),
  ]);
  const { items: pageItems, pagination } = paginate(items, query.page, query.pageSize, total);
  return { data: pageItems, meta: { pagination, counts } };
});

export const POST = apiHandler({ bodySchema: createSchema }, async ({ body }) => {
  const ctx = await requirePermission("lead.manage");
  const task = await createTask({
    organizationId: ctx.organization.organizationId,
    actorUserId: ctx.session.user.id,
    title: body.title,
    description: body.description ?? null,
    assignedUserId: body.assignedUserId,
    buyerId: body.buyerId ?? null,
    projectId: body.projectId ?? null,
    unitId: body.unitId ?? null,
    dueAt: new Date(body.dueAt),
    priority: body.priority,
  });
  return { data: task, status: 201 };
});

/**
 * @swagger
 * /api/v1/tasks:
 *   get:
 *     tags:
 *       - tasks
 *     summary: List / read tasks
 *     description: |
 *       **Auth:** `requirePermission("lead.read")`
 *     responses:
 *       "200":
 *         description: |
 *           OK
 *       "401":
 *         $ref: "#/components/responses/Unauthenticated"
 *       "403":
 *         $ref: "#/components/responses/Forbidden"
 *   post:
 *     tags:
 *       - tasks
 *     summary: Create tasks
 *     description: |
 *       **Auth:** `requirePermission("lead.manage") + requirePermission("lead.read")`
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
