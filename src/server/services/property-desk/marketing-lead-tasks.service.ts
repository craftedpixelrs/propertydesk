import "server-only";

import type { MarketingLeadTask, Prisma } from "@prisma/client";

import { prisma } from "@/server/db/prisma";
import { DomainError } from "@/lib/errors";
import {
  buildMarketingLeadScopeFilter,
  canViewMarketingLead,
  hasPdPermission,
  type PropertyDeskAccessContext,
} from "@/server/permissions/property-desk";

/**
 * Follow-up taskovi nad marketing lead-om.
 *
 * Zahtevi:
 *  - Kreiranje  → `pd_lead_task.create` + vidljivost lead-a.
 *  - Dodela drugom → `pd_lead_task.assign` (u suprotnom `assignedToUserId`
 *    mora ostati sam za sebe ili null).
 *  - Završavanje → `pd_lead_task.complete`.
 *
 * View filteri: `MINE_OPEN`, `MINE_OVERDUE`, `OPEN`, `OVERDUE`, `ALL`.
 */

export type MarketingLeadTaskWithRelations = MarketingLeadTask & {
  lead: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    stage: string;
  };
  assignedTo: { id: string; name: string; email: string } | null;
  createdBy: { id: string; name: string; email: string };
  completedBy: { id: string; name: string; email: string } | null;
};

const TASK_INCLUDE = {
  lead: {
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      stage: true,
    },
  },
  assignedTo: { select: { id: true, name: true, email: true } },
  createdBy: { select: { id: true, name: true, email: true } },
  completedBy: { select: { id: true, name: true, email: true } },
} satisfies Prisma.MarketingLeadTaskInclude;

// -----------------------------------------------------------------------------
// List (per lead)
// -----------------------------------------------------------------------------

export async function listTasksForLead(
  ctx: PropertyDeskAccessContext,
  leadId: string,
): Promise<MarketingLeadTaskWithRelations[]> {
  const lead = await prisma.marketingLead.findUnique({
    where: { id: leadId },
    select: { id: true, assignedToUserId: true, level: true },
  });
  if (!lead) throw new DomainError("NOT_FOUND", "Lead ne postoji.");
  if (!(await canViewMarketingLead(ctx, lead))) {
    throw new DomainError("FORBIDDEN", "Nemate pristup ovom lead-u.");
  }
  if (!(await hasPdPermission(ctx, "pd_lead_task.read"))) {
    throw new DomainError("FORBIDDEN", "Nemate dozvolu za čitanje taskova.");
  }

  return prisma.marketingLeadTask.findMany({
    where: { leadId },
    orderBy: [
      { completedAt: "asc" }, // open (null) first
      { dueAt: "asc" },
      { createdAt: "desc" },
    ],
    include: TASK_INCLUDE,
  });
}

// -----------------------------------------------------------------------------
// Global list (dashboard views)
// -----------------------------------------------------------------------------

export type TaskView =
  | "MINE_OPEN"
  | "MINE_OVERDUE"
  | "OPEN"
  | "OVERDUE"
  | "ALL";

export async function listTasksForView(
  ctx: PropertyDeskAccessContext,
  view: TaskView,
  limit = 50,
): Promise<MarketingLeadTaskWithRelations[]> {
  if (!(await hasPdPermission(ctx, "pd_lead_task.read"))) {
    throw new DomainError("FORBIDDEN", "Nemate dozvolu za čitanje taskova.");
  }
  const leadFilter =
    (await buildMarketingLeadScopeFilter(ctx)) as Prisma.MarketingLeadWhereInput;

  const now = new Date();
  const where: Prisma.MarketingLeadTaskWhereInput = { lead: leadFilter };

  const meId = ctx.isSuperAdmin ? ctx.session.user.id : ctx.teamMember.userId;

  switch (view) {
    case "MINE_OPEN":
      where.assignedToUserId = meId;
      where.completedAt = null;
      break;
    case "MINE_OVERDUE":
      where.assignedToUserId = meId;
      where.completedAt = null;
      where.dueAt = { lt: now };
      break;
    case "OPEN":
      where.completedAt = null;
      break;
    case "OVERDUE":
      where.completedAt = null;
      where.dueAt = { lt: now };
      break;
    case "ALL":
      break;
    default:
      break;
  }

  return prisma.marketingLeadTask.findMany({
    where,
    orderBy: [
      { completedAt: "asc" },
      { dueAt: "asc" },
      { createdAt: "desc" },
    ],
    take: Math.min(200, Math.max(1, limit)),
    include: TASK_INCLUDE,
  });
}

/**
 * Fast counters for the "Property Desk" dashboard tiles.
 */
export async function getLeadTaskCounts(
  ctx: PropertyDeskAccessContext,
): Promise<{ mineOpen: number; mineOverdue: number; teamOverdue: number }> {
  if (!(await hasPdPermission(ctx, "pd_lead_task.read"))) {
    return { mineOpen: 0, mineOverdue: 0, teamOverdue: 0 };
  }
  const leadFilter =
    (await buildMarketingLeadScopeFilter(ctx)) as Prisma.MarketingLeadWhereInput;
  const meId = ctx.isSuperAdmin ? ctx.session.user.id : ctx.teamMember.userId;
  const now = new Date();

  const [mineOpen, mineOverdue, teamOverdue] = await Promise.all([
    prisma.marketingLeadTask.count({
      where: {
        lead: leadFilter,
        assignedToUserId: meId,
        completedAt: null,
      },
    }),
    prisma.marketingLeadTask.count({
      where: {
        lead: leadFilter,
        assignedToUserId: meId,
        completedAt: null,
        dueAt: { lt: now },
      },
    }),
    prisma.marketingLeadTask.count({
      where: {
        lead: leadFilter,
        completedAt: null,
        dueAt: { lt: now },
      },
    }),
  ]);
  return { mineOpen, mineOverdue, teamOverdue };
}

// -----------------------------------------------------------------------------
// Create
// -----------------------------------------------------------------------------

export interface CreateTaskInput {
  leadId: string;
  title: string;
  description?: string | null;
  dueAt?: Date | null;
  assignedToUserId?: string | null;
}

export async function createLeadTask(
  ctx: PropertyDeskAccessContext,
  input: CreateTaskInput,
): Promise<MarketingLeadTaskWithRelations> {
  const lead = await prisma.marketingLead.findUnique({
    where: { id: input.leadId },
    select: { id: true, assignedToUserId: true, level: true },
  });
  if (!lead) throw new DomainError("NOT_FOUND", "Lead ne postoji.");
  if (!(await canViewMarketingLead(ctx, lead))) {
    throw new DomainError("FORBIDDEN", "Nemate pristup ovom lead-u.");
  }
  if (!(await hasPdPermission(ctx, "pd_lead_task.create"))) {
    throw new DomainError("FORBIDDEN", "Nemate dozvolu za kreiranje taska.");
  }

  const meId = ctx.session.user.id;
  const meTeamUserId = ctx.isSuperAdmin ? meId : ctx.teamMember.userId;
  const assignedToUserId =
    input.assignedToUserId === undefined || input.assignedToUserId === null
      ? meTeamUserId
      : input.assignedToUserId;

  // Assigning to someone other than yourself requires pd_lead_task.assign.
  if (
    assignedToUserId !== meTeamUserId &&
    !(await hasPdPermission(ctx, "pd_lead_task.assign"))
  ) {
    throw new DomainError(
      "FORBIDDEN",
      "Nemate dozvolu za dodelu taska drugom članu tima.",
    );
  }

  return prisma.marketingLeadTask.create({
    data: {
      leadId: input.leadId,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      dueAt: input.dueAt ?? null,
      assignedToUserId,
      createdByUserId: meId,
    },
    include: TASK_INCLUDE,
  });
}

// -----------------------------------------------------------------------------
// Update — reassignment, retitle, due-date shift
// -----------------------------------------------------------------------------

export interface UpdateTaskInput {
  title?: string;
  description?: string | null;
  dueAt?: Date | null;
  assignedToUserId?: string | null;
}

export async function updateLeadTask(
  ctx: PropertyDeskAccessContext,
  taskId: string,
  input: UpdateTaskInput,
): Promise<MarketingLeadTaskWithRelations> {
  const existing = await prisma.marketingLeadTask.findUnique({
    where: { id: taskId },
    include: { lead: { select: { id: true, assignedToUserId: true, level: true } } },
  });
  if (!existing) throw new DomainError("NOT_FOUND", "Task ne postoji.");
  if (!(await canViewMarketingLead(ctx, existing.lead))) {
    throw new DomainError("FORBIDDEN", "Nemate pristup ovom lead-u.");
  }
  if (!(await hasPdPermission(ctx, "pd_lead_task.create"))) {
    throw new DomainError("FORBIDDEN", "Nemate dozvolu za izmenu taska.");
  }

  const meTeamUserId = ctx.isSuperAdmin
    ? ctx.session.user.id
    : ctx.teamMember.userId;

  if (
    input.assignedToUserId !== undefined &&
    input.assignedToUserId !== existing.assignedToUserId &&
    input.assignedToUserId !== meTeamUserId &&
    !(await hasPdPermission(ctx, "pd_lead_task.assign"))
  ) {
    throw new DomainError(
      "FORBIDDEN",
      "Nemate dozvolu za dodelu taska drugom članu tima.",
    );
  }

  const data: Prisma.MarketingLeadTaskUpdateInput = {};
  if (input.title !== undefined) data.title = input.title.trim();
  if (input.description !== undefined) {
    data.description = input.description?.trim() || null;
  }
  if (input.dueAt !== undefined) data.dueAt = input.dueAt;
  if (input.assignedToUserId !== undefined) {
    data.assignedTo = input.assignedToUserId
      ? { connect: { id: input.assignedToUserId } }
      : { disconnect: true };
  }

  return prisma.marketingLeadTask.update({
    where: { id: taskId },
    data,
    include: TASK_INCLUDE,
  });
}

// -----------------------------------------------------------------------------
// Complete / reopen
// -----------------------------------------------------------------------------

export async function completeLeadTask(
  ctx: PropertyDeskAccessContext,
  taskId: string,
  completed: boolean,
): Promise<MarketingLeadTaskWithRelations> {
  const existing = await prisma.marketingLeadTask.findUnique({
    where: { id: taskId },
    include: { lead: { select: { id: true, assignedToUserId: true, level: true } } },
  });
  if (!existing) throw new DomainError("NOT_FOUND", "Task ne postoji.");
  if (!(await canViewMarketingLead(ctx, existing.lead))) {
    throw new DomainError("FORBIDDEN", "Nemate pristup ovom lead-u.");
  }
  if (!(await hasPdPermission(ctx, "pd_lead_task.complete"))) {
    throw new DomainError(
      "FORBIDDEN",
      "Nemate dozvolu za obeležavanje taska kao završenog.",
    );
  }

  const meId = ctx.session.user.id;
  const now = new Date();
  return prisma.marketingLeadTask.update({
    where: { id: taskId },
    data: completed
      ? { completedAt: now, completedByUserId: meId }
      : { completedAt: null, completedByUserId: null },
    include: TASK_INCLUDE,
  });
}
