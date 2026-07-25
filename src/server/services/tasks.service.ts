import "server-only";
import type { Prisma, TaskPriority, TaskStatus } from "@prisma/client";

import { prisma } from "@/server/db/prisma";
import { DomainErrors } from "@/lib/errors";
import { recordAudit } from "@/server/audit/audit";
import { notify } from "@/server/services/notifications.service";
import { taskAssignedEmail } from "@/server/email/templates";

/**
 * Tasks service.
 *
 * Supports the four canonical views surfaced in the UI:
 *   - `mine`     — everything assigned to the current user (open/in-progress)
 *   - `today`    — assigned to the user and due today
 *   - `overdue`  — assigned to the user, due in the past, not done
 *   - `upcoming` — assigned to the user, due within the next 7 days
 *
 * On creation (or reassignment) the assignee gets an in-app notification and,
 * if we can resolve their email, an email.
 */

export type TaskView = "mine" | "today" | "overdue" | "upcoming" | "all";

export interface ListTasksInput {
  organizationId: string;
  currentUserId: string;
  view: TaskView;
  page: number;
  pageSize: number;
  status?: TaskStatus[];
  buyerId?: string;
}

const OPEN_STATUSES: TaskStatus[] = ["OPEN", "IN_PROGRESS"];

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfToday(): Date {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

function buildViewWhere(input: ListTasksInput): Prisma.TaskWhereInput {
  const base: Prisma.TaskWhereInput = {
    organizationId: input.organizationId,
    ...(input.buyerId ? { buyerId: input.buyerId } : {}),
  };

  switch (input.view) {
    case "mine":
      return {
        ...base,
        assignedUserId: input.currentUserId,
        status: { in: input.status ?? OPEN_STATUSES },
      };
    case "today":
      return {
        ...base,
        assignedUserId: input.currentUserId,
        status: { in: OPEN_STATUSES },
        dueAt: { gte: startOfToday(), lte: endOfToday() },
      };
    case "overdue":
      return {
        ...base,
        assignedUserId: input.currentUserId,
        status: { in: OPEN_STATUSES },
        dueAt: { lt: startOfToday() },
      };
    case "upcoming": {
      const in7 = new Date();
      in7.setDate(in7.getDate() + 7);
      in7.setHours(23, 59, 59, 999);
      return {
        ...base,
        assignedUserId: input.currentUserId,
        status: { in: OPEN_STATUSES },
        dueAt: { gt: endOfToday(), lte: in7 },
      };
    }
    case "all":
    default:
      return {
        ...base,
        ...(input.status?.length ? { status: { in: input.status } } : {}),
      };
  }
}

export async function listTasks(input: ListTasksInput) {
  const where = buildViewWhere(input);
  const [total, rows] = await Promise.all([
    prisma.task.count({ where }),
    prisma.task.findMany({
      where,
      orderBy: [{ dueAt: "asc" }],
      skip: (input.page - 1) * input.pageSize,
      take: input.pageSize,
      include: {
        assignedUser: { select: { id: true, name: true } },
        buyer: { select: { id: true, firstName: true, lastName: true } },
      },
    }),
  ]);
  return { items: rows, total };
}

/** Counts for the view tab badges (mine/today/overdue/upcoming). */
export async function getTaskViewCounts(input: {
  organizationId: string;
  currentUserId: string;
}) {
  const [today, overdue, upcoming, mine] = await Promise.all([
    prisma.task.count({ where: buildViewWhere({ ...input, view: "today", page: 1, pageSize: 1 }) }),
    prisma.task.count({ where: buildViewWhere({ ...input, view: "overdue", page: 1, pageSize: 1 }) }),
    prisma.task.count({ where: buildViewWhere({ ...input, view: "upcoming", page: 1, pageSize: 1 }) }),
    prisma.task.count({ where: buildViewWhere({ ...input, view: "mine", page: 1, pageSize: 1 }) }),
  ]);
  return { mine, today, overdue, upcoming };
}

export interface CreateTaskInput {
  organizationId: string;
  actorUserId: string;
  title: string;
  description?: string | null;
  assignedUserId?: string;
  buyerId?: string | null;
  projectId?: string | null;
  unitId?: string | null;
  dueAt: Date;
  priority?: TaskPriority;
}

async function assertAssigneeInOrg(organizationId: string, userId: string): Promise<void> {
  const member = await prisma.member.findFirst({
    where: { organizationId, userId },
    select: { id: true },
  });
  if (!member) {
    throw DomainErrors.badRequest("Zaduženi korisnik nije član organizacije.");
  }
}

export async function createTask(input: CreateTaskInput) {
  const assignedUserId = input.assignedUserId ?? input.actorUserId;
  await assertAssigneeInOrg(input.organizationId, assignedUserId);

  if (input.buyerId) {
    const buyer = await prisma.buyer.findFirst({
      where: { id: input.buyerId, organizationId: input.organizationId },
      select: { id: true },
    });
    if (!buyer) throw DomainErrors.notFound("Kupac");
  }

  const created = await prisma.task.create({
    data: {
      organizationId: input.organizationId,
      title: input.title,
      description: input.description ?? null,
      assignedUserId,
      buyerId: input.buyerId ?? null,
      projectId: input.projectId ?? null,
      unitId: input.unitId ?? null,
      dueAt: input.dueAt,
      priority: input.priority ?? "NORMAL",
      createdByUserId: input.actorUserId,
    },
  });

  await recordAudit({
    action: "task.created",
    entityType: "Task",
    entityId: created.id,
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    newValues: { title: created.title, assignedUserId, dueAt: created.dueAt },
  });

  // Notify the assignee (skip self-assignment noise).
  if (assignedUserId !== input.actorUserId) {
    const assignee = await prisma.user.findUnique({
      where: { id: assignedUserId },
      select: { email: true },
    });
    await notify({
      organizationId: input.organizationId,
      userId: assignedUserId,
      category: "TASK",
      title: "Novi zadatak",
      message: created.title,
      entityType: "Task",
      entityId: created.id,
      actionUrl: "/zadaci",
      email: assignee?.email
        ? {
            to: assignee.email,
            message: taskAssignedEmail({
              title: created.title,
              dueAt: created.dueAt,
              actionUrl: "/zadaci",
            }),
          }
        : null,
    });
  }

  return created;
}

export interface UpdateTaskInput {
  organizationId: string;
  actorUserId: string;
  taskId: string;
  patch: {
    title?: string;
    description?: string | null;
    assignedUserId?: string;
    dueAt?: Date;
    priority?: TaskPriority;
    status?: TaskStatus;
  };
}

export async function updateTask(input: UpdateTaskInput) {
  const existing = await prisma.task.findFirst({
    where: { id: input.taskId, organizationId: input.organizationId },
  });
  if (!existing) throw DomainErrors.notFound("Zadatak");

  if (input.patch.assignedUserId) {
    await assertAssigneeInOrg(input.organizationId, input.patch.assignedUserId);
  }

  const statusChangingToDone =
    input.patch.status === "COMPLETED" && existing.status !== "COMPLETED";

  const updated = await prisma.task.update({
    where: { id: input.taskId },
    data: {
      title: input.patch.title ?? undefined,
      description: input.patch.description !== undefined ? input.patch.description : undefined,
      assignedUserId: input.patch.assignedUserId ?? undefined,
      dueAt: input.patch.dueAt ?? undefined,
      priority: input.patch.priority ?? undefined,
      status: input.patch.status ?? undefined,
      completedAt: statusChangingToDone
        ? new Date()
        : input.patch.status && input.patch.status !== "COMPLETED"
          ? null
          : undefined,
    },
  });

  await recordAudit({
    action: statusChangingToDone ? "task.completed" : "task.updated",
    entityType: "Task",
    entityId: updated.id,
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    previousValues: { status: existing.status, assignedUserId: existing.assignedUserId },
    newValues: { status: updated.status, assignedUserId: updated.assignedUserId },
  });

  // Notify a newly-assigned user (reassignment).
  if (
    input.patch.assignedUserId &&
    input.patch.assignedUserId !== existing.assignedUserId &&
    input.patch.assignedUserId !== input.actorUserId
  ) {
    const assignee = await prisma.user.findUnique({
      where: { id: input.patch.assignedUserId },
      select: { email: true },
    });
    await notify({
      organizationId: input.organizationId,
      userId: input.patch.assignedUserId,
      category: "TASK",
      title: "Zadatak Vam je dodeljen",
      message: updated.title,
      entityType: "Task",
      entityId: updated.id,
      actionUrl: "/zadaci",
      email: assignee?.email
        ? {
            to: assignee.email,
            message: taskAssignedEmail({
              title: updated.title,
              dueAt: updated.dueAt,
              actionUrl: "/zadaci",
            }),
          }
        : null,
    });
  }

  return updated;
}

export async function completeTask(input: {
  organizationId: string;
  actorUserId: string;
  taskId: string;
}) {
  return updateTask({
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    taskId: input.taskId,
    patch: { status: "COMPLETED" },
  });
}
