import "server-only";

import type {
  MarketingLeadActivity,
  MarketingLeadActivityKind,
  Prisma,
} from "@prisma/client";

import { prisma } from "@/server/db/prisma";
import { DomainError } from "@/lib/errors";
import {
  canViewMarketingLead,
  hasPdPermission,
  type PropertyDeskAccessContext,
} from "@/server/permissions/property-desk";

/**
 * Timeline aktivnosti nad marketing lead-om.
 *
 * `SYSTEM`, `STAGE_CHANGE`, `ASSIGNMENT` i `CONVERSION` redovi se pišu
 * automatski iz drugih servisa preko `recordSystemActivity()`. Manuelni
 * redovi (`CALL`/`EMAIL`/`MEETING`/`NOTE`) idu kroz
 * `recordManualActivity()` i zahtevaju `pd_lead_activity.create`.
 */

export type MarketingLeadActivityWithActor = MarketingLeadActivity & {
  actor: { id: string; name: string; email: string; image: string | null } | null;
};

const ACTIVITY_INCLUDE = {
  actor: {
    select: { id: true, name: true, email: true, image: true },
  },
} satisfies Prisma.MarketingLeadActivityInclude;

// -----------------------------------------------------------------------------
// Read
// -----------------------------------------------------------------------------

export async function listLeadActivities(
  ctx: PropertyDeskAccessContext,
  leadId: string,
): Promise<MarketingLeadActivityWithActor[]> {
  const lead = await prisma.marketingLead.findUnique({
    where: { id: leadId },
    select: { id: true, assignedToUserId: true, level: true },
  });
  if (!lead) throw new DomainError("NOT_FOUND", "Lead ne postoji.");
  if (!(await canViewMarketingLead(ctx, lead))) {
    throw new DomainError("FORBIDDEN", "Nemate pristup ovom lead-u.");
  }
  if (!(await hasPdPermission(ctx, "pd_lead_activity.read"))) {
    throw new DomainError(
      "FORBIDDEN",
      "Nemate dozvolu za pregled timeline-a.",
    );
  }

  return prisma.marketingLeadActivity.findMany({
    where: { leadId },
    orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
    include: ACTIVITY_INCLUDE,
  });
}

// -----------------------------------------------------------------------------
// Manual create — CALL / EMAIL / MEETING / NOTE
// -----------------------------------------------------------------------------

export interface CreateManualActivityInput {
  kind: Extract<
    MarketingLeadActivityKind,
    "CALL" | "EMAIL" | "MEETING" | "NOTE"
  >;
  title: string;
  body?: string | null;
  occurredAt?: Date;
}

export async function recordManualActivity(
  ctx: PropertyDeskAccessContext,
  leadId: string,
  input: CreateManualActivityInput,
): Promise<MarketingLeadActivityWithActor> {
  const lead = await prisma.marketingLead.findUnique({
    where: { id: leadId },
    select: { id: true, assignedToUserId: true, level: true },
  });
  if (!lead) throw new DomainError("NOT_FOUND", "Lead ne postoji.");
  if (!(await canViewMarketingLead(ctx, lead))) {
    throw new DomainError("FORBIDDEN", "Nemate pristup ovom lead-u.");
  }
  if (!(await hasPdPermission(ctx, "pd_lead_activity.create"))) {
    throw new DomainError(
      "FORBIDDEN",
      "Nemate dozvolu za unos aktivnosti.",
    );
  }

  const actorUserId = ctx.session.user.id;
  return prisma.marketingLeadActivity.create({
    data: {
      leadId,
      kind: input.kind,
      title: input.title.trim(),
      body: input.body?.trim() || null,
      actorUserId,
      occurredAt: input.occurredAt ?? new Date(),
    },
    include: ACTIVITY_INCLUDE,
  });
}

// -----------------------------------------------------------------------------
// System-emitted rows — called from other services on lifecycle events.
// These bypass the pd_lead_activity.create permission check because they
// are triggered by an already-authorized parent operation (stage change,
// reassign, convert, or landing form submission).
// -----------------------------------------------------------------------------

export interface SystemActivityInput {
  leadId: string;
  kind: Extract<
    MarketingLeadActivityKind,
    "STAGE_CHANGE" | "ASSIGNMENT" | "CONVERSION" | "SYSTEM"
  >;
  title: string;
  body?: string | null;
  actorUserId?: string | null;
  metadata?: Prisma.InputJsonValue | null;
  occurredAt?: Date;
}

export async function recordSystemActivity(
  input: SystemActivityInput,
): Promise<MarketingLeadActivity> {
  return prisma.marketingLeadActivity.create({
    data: {
      leadId: input.leadId,
      kind: input.kind,
      title: input.title,
      body: input.body ?? null,
      actorUserId: input.actorUserId ?? null,
      metadata: input.metadata ?? undefined,
      occurredAt: input.occurredAt ?? new Date(),
    },
  });
}
