import "server-only";
import type { ActivityType, Prisma } from "@prisma/client";

import { prisma } from "@/server/db/prisma";
import { DomainErrors } from "@/lib/errors";
import { recordAudit } from "@/server/audit/audit";

/**
 * Activities service — the CRM timeline.
 *
 * Activities are append-only journal entries (notes, calls, meetings, status
 * changes, …) attached to a buyer and/or project/unit. They are always scoped
 * to an organization and attributed to an actor. Domain services may also
 * record `SYSTEM` activities (e.g. "reservation created") via `recordActivity`
 * from inside their own flow — those pass `tx` so they join the caller's
 * transaction.
 */

export interface RecordActivityInput {
  organizationId: string;
  actorUserId: string;
  type: ActivityType;
  description: string;
  buyerId?: string | null;
  projectId?: string | null;
  unitId?: string | null;
  occurredAt?: Date;
  tx?: Prisma.TransactionClient;
}

export async function recordActivity(input: RecordActivityInput) {
  const client = input.tx ?? prisma;
  const activity = await client.activity.create({
    data: {
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      type: input.type,
      description: input.description,
      buyerId: input.buyerId ?? null,
      projectId: input.projectId ?? null,
      unitId: input.unitId ?? null,
      occurredAt: input.occurredAt ?? new Date(),
    },
  });

  if (!input.tx) {
    await recordAudit({
      action: "activity.recorded",
      entityType: "Activity",
      entityId: activity.id,
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      newValues: { type: activity.type, buyerId: activity.buyerId },
    });
  }

  return activity;
}

export interface ListActivitiesInput {
  organizationId: string;
  page: number;
  pageSize: number;
  buyerId?: string;
  projectId?: string;
  type?: ActivityType[];
}

export async function listActivities(input: ListActivitiesInput) {
  const where: Prisma.ActivityWhereInput = {
    organizationId: input.organizationId,
    ...(input.buyerId ? { buyerId: input.buyerId } : {}),
    ...(input.projectId ? { projectId: input.projectId } : {}),
    ...(input.type?.length ? { type: { in: input.type } } : {}),
  };

  const [total, rows] = await Promise.all([
    prisma.activity.count({ where }),
    prisma.activity.findMany({
      where,
      orderBy: { occurredAt: "desc" },
      skip: (input.page - 1) * input.pageSize,
      take: input.pageSize,
      include: {
        actor: { select: { id: true, name: true } },
        buyer: { select: { id: true, firstName: true, lastName: true } },
      },
    }),
  ]);

  return { items: rows, total };
}

/** Verify the buyer belongs to the org before attaching an activity to it. */
export async function assertBuyerInOrg(
  organizationId: string,
  buyerId: string,
): Promise<void> {
  const buyer = await prisma.buyer.findFirst({
    where: { id: buyerId, organizationId },
    select: { id: true },
  });
  if (!buyer) throw DomainErrors.notFound("Kupac");
}
