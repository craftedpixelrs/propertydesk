import "server-only";
import { Prisma, type ReservationSource, type ReservationStatus } from "@prisma/client";

import { prisma } from "@/server/db/prisma";
import { DomainErrors } from "@/lib/errors";
import { recordAudit } from "@/server/audit/audit";
import { changeUnitStatus } from "@/server/services/units.service";
import { recordActivity } from "@/server/services/activities.service";
import { notify } from "@/server/services/notifications.service";
import {
  reservationApprovedEmail,
  reservationExpiredEmail,
  reservationRejectedEmail,
  reservationRequestedEmail,
} from "@/server/email/templates";
import { logger } from "@/server/logger";

/**
 * ReservationService — the transaction-critical core of Phase 3.
 *
 * Invariants:
 *   - At most ONE active reservation (REQUESTED or APPROVED) per unit. Enforced
 *     at three layers: (1) a Postgres partial unique index
 *     `reservation_unit_active_uniq`, (2) a `SELECT … FOR UPDATE` row lock on
 *     the unit inside `create`, and (3) an application check. Layer (1) is the
 *     ultimate guarantee under full concurrency.
 *   - Every state change is idempotent, writes a `ReservationStatusHistory`
 *     row, moves the unit through `UnitStatusService`, and bumps `version`.
 *   - The unit is the single source of truth for availability; reservations
 *     never bypass `changeUnitStatus`.
 */

const ACTIVE_STATUSES: ReservationStatus[] = ["REQUESTED", "APPROVED"];
const DEFAULT_HOLD_DAYS = 14;

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function isPrismaUniqueViolation(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
}

// -----------------------------------------------------------------------------
// List / read
// -----------------------------------------------------------------------------

export interface ListReservationsInput {
  organizationId: string;
  page: number;
  pageSize: number;
  status?: ReservationStatus[];
  unitId?: string;
  buyerId?: string;
  projectId?: string;
  sourceType?: ReservationSource;
}

export async function listReservations(input: ListReservationsInput) {
  const where: Prisma.ReservationWhereInput = {
    organizationId: input.organizationId,
    ...(input.status?.length ? { status: { in: input.status } } : {}),
    ...(input.unitId ? { unitId: input.unitId } : {}),
    ...(input.buyerId ? { buyerId: input.buyerId } : {}),
    ...(input.projectId ? { projectId: input.projectId } : {}),
    ...(input.sourceType ? { sourceType: input.sourceType } : {}),
  };

  const [total, rows] = await Promise.all([
    prisma.reservation.count({ where }),
    prisma.reservation.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (input.page - 1) * input.pageSize,
      take: input.pageSize,
      include: {
        unit: { select: { id: true, code: true } },
        project: { select: { id: true, name: true } },
        buyer: { select: { id: true, firstName: true, lastName: true } },
        assignedUser: { select: { id: true, name: true } },
      },
    }),
  ]);
  return { items: rows, total };
}

export interface ReservationBoardCard {
  id: string;
  status: ReservationStatus;
  version: number;
  unitCode: string;
  projectName: string;
  buyerName: string;
  createdAt: Date;
  expiresAt: Date | null;
}

export interface ReservationBoardColumn {
  status: ReservationStatus;
  total: number;
  cards: ReservationBoardCard[];
}

/**
 * Board-shaped listing: one bucket per status with a hard cap on the
 * number of cards per column so a large tenant does not send thousands
 * of rows to the client.
 */
export async function listReservationsBoard(input: {
  organizationId: string;
  projectId?: string;
  perColumnLimit?: number;
}): Promise<ReservationBoardColumn[]> {
  const per = Math.min(Math.max(input.perColumnLimit ?? 50, 1), 200);
  const baseWhere: Prisma.ReservationWhereInput = {
    organizationId: input.organizationId,
    ...(input.projectId ? { projectId: input.projectId } : {}),
  };
  const statuses: ReservationStatus[] = [
    "REQUESTED",
    "APPROVED",
    "CONVERTED",
    "REJECTED",
    "EXPIRED",
    "CANCELED",
  ];

  const [totalsByStatus, rows] = await Promise.all([
    prisma.reservation.groupBy({
      by: ["status"],
      where: baseWhere,
      _count: { _all: true },
    }),
    Promise.all(
      statuses.map((status) =>
        prisma.reservation.findMany({
          where: { ...baseWhere, status },
          orderBy: { createdAt: "desc" },
          take: per,
          include: {
            unit: { select: { code: true } },
            project: { select: { name: true } },
            buyer: { select: { firstName: true, lastName: true } },
          },
        }),
      ),
    ),
  ]);
  const totals = new Map(totalsByStatus.map((r) => [r.status, r._count._all] as const));

  return statuses.map((status, i) => ({
    status,
    total: totals.get(status) ?? 0,
    cards: rows[i]!.map((r) => ({
      id: r.id,
      status: r.status,
      version: r.version,
      unitCode: r.unit?.code ?? "—",
      projectName: r.project?.name ?? "—",
      buyerName: r.buyer ? `${r.buyer.firstName} ${r.buyer.lastName}` : "—",
      createdAt: r.createdAt,
      expiresAt: r.expiresAt,
    })),
  }));
}

export async function getReservationById(organizationId: string, reservationId: string) {
  const reservation = await prisma.reservation.findFirst({
    where: { id: reservationId, organizationId },
    include: {
      unit: { select: { id: true, code: true, status: true } },
      project: { select: { id: true, name: true } },
      buyer: {
        select: { id: true, firstName: true, lastName: true, phone: true, email: true },
      },
      assignedUser: { select: { id: true, name: true } },
      createdByUser: { select: { id: true, name: true } },
      statusHistory: {
        orderBy: { changedAt: "desc" },
        include: { changedByUser: { select: { id: true, name: true } } },
      },
    },
  });
  if (!reservation) throw DomainErrors.notFound("Rezervacija");
  return reservation;
}

// -----------------------------------------------------------------------------
// Create
// -----------------------------------------------------------------------------

export interface CreateReservationInput {
  organizationId: string;
  actorUserId: string;
  unitId: string;
  buyerId: string;
  assignedUserId?: string | null;
  reservationAmount?: number | null;
  currency?: string;
  notes?: string | null;
  sourceType?: ReservationSource;
  agencyOrganizationId?: string | null;
  agencyAgentUserId?: string | null;
  /** C2 — copied from the originating `ReservationRequest.referralCode`. */
  referralCode?: string | null;
}

export async function createReservation(input: CreateReservationInput) {
  const reservation = await prisma
    .$transaction(async (tx) => {
      // Lock the unit row so concurrent reservation attempts serialize here.
      await tx.$queryRaw`SELECT id FROM "unit" WHERE id = ${input.unitId} AND "organizationId" = ${input.organizationId} FOR UPDATE`;

      const unit = await tx.unit.findFirst({
        where: { id: input.unitId, organizationId: input.organizationId },
        select: { id: true, status: true, code: true, projectId: true, archivedAt: true },
      });
      if (!unit) throw DomainErrors.notFound("Jedinica");
      if (unit.archivedAt) {
        throw DomainErrors.invalidState("Jedinica je arhivirana.");
      }
      if (unit.status !== "AVAILABLE" && unit.status !== "ON_HOLD") {
        throw DomainErrors.invalidState(
          "Jedinica trenutno nije dostupna za rezervaciju.",
        );
      }

      // Application-level guard (belt-and-suspenders with the unique index).
      const active = await tx.reservation.findFirst({
        where: { unitId: input.unitId, status: { in: ACTIVE_STATUSES } },
        select: { id: true },
      });
      if (active) {
        throw DomainErrors.conflict("Za ovu jedinicu već postoji aktivna rezervacija.");
      }

      const buyer = await tx.buyer.findFirst({
        where: { id: input.buyerId, organizationId: input.organizationId },
        select: { id: true },
      });
      if (!buyer) throw DomainErrors.notFound("Kupac");

      const created = await tx.reservation.create({
        data: {
          organizationId: input.organizationId,
          projectId: unit.projectId,
          unitId: input.unitId,
          buyerId: input.buyerId,
          createdByUserId: input.actorUserId,
          assignedUserId: input.assignedUserId ?? input.actorUserId,
          sourceType: input.sourceType ?? "INTERNAL",
          agencyOrganizationId: input.agencyOrganizationId ?? null,
          agencyAgentUserId: input.agencyAgentUserId ?? null,
          status: "REQUESTED",
          reservationAmount:
            input.reservationAmount != null ? input.reservationAmount : null,
          currency: input.currency ?? "EUR",
          notes: input.notes ?? null,
          referralCode: input.referralCode ?? null,
        },
      });

      await tx.reservationStatusHistory.create({
        data: {
          organizationId: input.organizationId,
          reservationId: created.id,
          previousStatus: "REQUESTED",
          newStatus: "REQUESTED",
          reason: "Kreirana rezervacija",
          changedByUserId: input.actorUserId,
        },
      });

      // Soft-hold the unit while the request is pending.
      if (unit.status === "AVAILABLE") {
        await changeUnitStatus({
          organizationId: input.organizationId,
          actorUserId: input.actorUserId,
          unitId: input.unitId,
          newStatus: "ON_HOLD",
          reason: "Rezervacija zatražena",
          tx,
        });
      }

      await recordActivity({
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        type: "SYSTEM",
        description: `Kreirana rezervacija za jedinicu ${unit.code}.`,
        buyerId: input.buyerId,
        unitId: input.unitId,
        projectId: unit.projectId,
        tx,
      });

      return created;
    })
    .catch((err) => {
      if (isPrismaUniqueViolation(err)) {
        throw DomainErrors.conflict("Za ovu jedinicu već postoji aktivna rezervacija.");
      }
      throw err;
    });

  await recordAudit({
    action: "reservation.created",
    entityType: "Reservation",
    entityId: reservation.id,
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    newValues: {
      unitId: reservation.unitId,
      buyerId: reservation.buyerId,
      sourceType: reservation.sourceType,
    },
  });

  // Notify assignee (post-commit, best-effort).
  await notifyReservationParticipants(reservation.id, "created").catch((err) =>
    logger.error("reservation.notify_failed", { error: (err as Error)?.message }),
  );

  return reservation;
}

// -----------------------------------------------------------------------------
// State transitions
// -----------------------------------------------------------------------------

const ALLOWED_RESERVATION_TRANSITIONS: Record<ReservationStatus, ReservationStatus[]> = {
  REQUESTED: ["APPROVED", "REJECTED", "CANCELED", "EXPIRED"],
  APPROVED: ["CONVERTED", "CANCELED", "EXPIRED"],
  REJECTED: [],
  EXPIRED: [],
  CANCELED: [],
  CONVERTED: [],
};

interface TransitionResult {
  id: string;
  status: ReservationStatus;
  alreadyInState: boolean;
}

async function transition(input: {
  organizationId: string;
  actorUserId: string | null;
  reservationId: string;
  target: ReservationStatus;
  expectedVersion?: number;
  reason?: string | null;
  unitStatus?: "AVAILABLE" | "RESERVED" | "CONTRACTED";
  setTimestamps?: (now: Date) => Prisma.ReservationUpdateInput;
}): Promise<TransitionResult> {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.reservation.findFirst({
      where: { id: input.reservationId, organizationId: input.organizationId },
      select: { id: true, status: true, version: true, unitId: true },
    });
    if (!existing) throw DomainErrors.notFound("Rezervacija");

    // Idempotency: if already in the target state, no-op.
    if (existing.status === input.target) {
      return { id: existing.id, status: existing.status, alreadyInState: true };
    }

    if (
      input.expectedVersion != null &&
      existing.version !== input.expectedVersion
    ) {
      throw DomainErrors.optimisticLock();
    }

    const allowed = ALLOWED_RESERVATION_TRANSITIONS[existing.status] ?? [];
    if (!allowed.includes(input.target)) {
      throw DomainErrors.invalidState(
        `Prelaz rezervacije iz "${existing.status}" u "${input.target}" nije dozvoljen.`,
      );
    }

    const now = new Date();
    await tx.reservation.update({
      where: { id: existing.id },
      data: {
        status: input.target,
        version: { increment: 1 },
        ...(input.setTimestamps ? input.setTimestamps(now) : {}),
      },
    });

    await tx.reservationStatusHistory.create({
      data: {
        organizationId: input.organizationId,
        reservationId: existing.id,
        previousStatus: existing.status,
        newStatus: input.target,
        reason: input.reason ?? null,
        changedByUserId: input.actorUserId,
      },
    });

    if (input.unitStatus) {
      if (!input.actorUserId) {
        throw DomainErrors.badRequest(
          "Nedostaje korisnik za promenu statusa jedinice.",
        );
      }
      await changeUnitStatus({
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        unitId: existing.unitId,
        newStatus: input.unitStatus,
        reason: `Rezervacija: ${input.target}`,
        tx,
        // Reject/cancel/expire may return SOLD-adjacent statuses to AVAILABLE.
        allowOverride: input.unitStatus === "AVAILABLE",
      });
    }

    return { id: existing.id, status: input.target, alreadyInState: false };
  });
}

export async function approveReservation(input: {
  organizationId: string;
  actorUserId: string;
  reservationId: string;
  expectedVersion?: number;
  holdDays?: number;
}): Promise<TransitionResult> {
  const result = await transition({
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    reservationId: input.reservationId,
    target: "APPROVED",
    expectedVersion: input.expectedVersion,
    reason: "Rezervacija odobrena",
    unitStatus: "RESERVED",
    setTimestamps: (now) => ({
      approvedAt: now,
      expiresAt: addDays(now, input.holdDays ?? DEFAULT_HOLD_DAYS),
    }),
  });
  if (!result.alreadyInState) {
    await recordAudit({
      action: "reservation.approved",
      entityType: "Reservation",
      entityId: input.reservationId,
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
    });
    await notifyReservationParticipants(input.reservationId, "approved").catch(() => {});
  }
  return result;
}

export async function rejectReservation(input: {
  organizationId: string;
  actorUserId: string;
  reservationId: string;
  reason?: string;
  expectedVersion?: number;
}): Promise<TransitionResult> {
  const result = await transition({
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    reservationId: input.reservationId,
    target: "REJECTED",
    expectedVersion: input.expectedVersion,
    reason: input.reason ?? "Rezervacija odbijena",
    unitStatus: "AVAILABLE",
    setTimestamps: (now) => ({ rejectedAt: now, rejectionReason: input.reason ?? null }),
  });
  if (!result.alreadyInState) {
    await recordAudit({
      action: "reservation.rejected",
      entityType: "Reservation",
      entityId: input.reservationId,
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      newValues: { reason: input.reason },
    });
    await notifyReservationParticipants(input.reservationId, "rejected").catch(() => {});
  }
  return result;
}

export async function cancelReservation(input: {
  organizationId: string;
  actorUserId: string;
  reservationId: string;
  reason?: string;
  expectedVersion?: number;
}): Promise<TransitionResult> {
  const result = await transition({
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    reservationId: input.reservationId,
    target: "CANCELED",
    expectedVersion: input.expectedVersion,
    reason: input.reason ?? "Rezervacija otkazana",
    unitStatus: "AVAILABLE",
    setTimestamps: (now) => ({ canceledAt: now, cancellationReason: input.reason ?? null }),
  });
  if (!result.alreadyInState) {
    await recordAudit({
      action: "reservation.canceled",
      entityType: "Reservation",
      entityId: input.reservationId,
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      newValues: { reason: input.reason },
    });
    await notifyReservationParticipants(input.reservationId, "canceled").catch(() => {});
  }
  return result;
}

/**
 * Convert an APPROVED reservation into a DRAFT sale via SaleService.
 *
 * The reservation → CONVERTED transition and the sale creation happen inside
 * a single transaction owned by `createSaleFromReservation`, so callers only
 * see two outcomes: (a) both succeed or (b) neither does.
 */
export async function convertReservation(input: {
  organizationId: string;
  actorUserId: string;
  reservationId: string;
  listPrice: number | string;
  discountType?: "PERCENTAGE" | "FIXED" | null;
  discountValue?: number | string | null;
  currency?: string;
  depositAmount?: number | string | null;
  notes?: string | null;
  responsibleUserId?: string | null;
}) {
  // Lazy import to avoid a circular dependency between reservations and sales.
  const { createSaleFromReservation } = await import(
    "@/server/services/sales/sales.service"
  );
  return createSaleFromReservation({
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    reservationId: input.reservationId,
    listPrice: input.listPrice,
    discountType: input.discountType ?? null,
    discountValue: input.discountValue ?? null,
    currency: input.currency,
    depositAmount: input.depositAmount ?? null,
    notes: input.notes ?? null,
    responsibleUserId: input.responsibleUserId ?? null,
  });
}

export async function expireReservation(input: {
  organizationId: string;
  actorUserId?: string | null;
  reservationId: string;
}): Promise<TransitionResult> {
  // The unit-status history requires a real user. When invoked by the cron
  // job there is no actor, so we attribute the change to the reservation's
  // owner (assignee, falling back to creator).
  let actorUserId = input.actorUserId ?? null;
  if (!actorUserId) {
    const owner = await prisma.reservation.findFirst({
      where: { id: input.reservationId, organizationId: input.organizationId },
      select: { assignedUserId: true, createdByUserId: true },
    });
    actorUserId = owner?.assignedUserId ?? owner?.createdByUserId ?? null;
  }

  const result = await transition({
    organizationId: input.organizationId,
    actorUserId,
    reservationId: input.reservationId,
    target: "EXPIRED",
    reason: "Rezervacija istekla",
    unitStatus: "AVAILABLE",
  });
  if (!result.alreadyInState) {
    await recordAudit({
      action: "reservation.expired",
      entityType: "Reservation",
      entityId: input.reservationId,
      organizationId: input.organizationId,
      actorUserId: input.actorUserId ?? null,
    });
    await notifyReservationParticipants(input.reservationId, "expired").catch(() => {});
  }
  return result;
}

/**
 * Batch expiry used by the `expire-reservations` cron job. Idempotent: only
 * touches APPROVED reservations whose `expiresAt` is in the past. Re-running
 * immediately after is a no-op because those rows are now EXPIRED.
 */
export async function expireDueReservations(now: Date = new Date()): Promise<{
  processed: number;
  errors: number;
}> {
  const due = await prisma.reservation.findMany({
    where: {
      status: "APPROVED",
      expiresAt: { not: null, lt: now },
    },
    select: { id: true, organizationId: true },
    take: 500,
  });

  let processed = 0;
  let errors = 0;
  for (const row of due) {
    try {
      const res = await expireReservation({
        organizationId: row.organizationId,
        reservationId: row.id,
        actorUserId: null,
      });
      if (!res.alreadyInState) processed += 1;
    } catch (err) {
      errors += 1;
      logger.error("reservation.expire_failed", {
        reservationId: row.id,
        error: (err as Error)?.message,
      });
    }
  }

  return { processed, errors };
}

// -----------------------------------------------------------------------------
// Notifications
// -----------------------------------------------------------------------------

type ReservationEvent = "created" | "approved" | "rejected" | "canceled" | "expired";

async function notifyReservationParticipants(
  reservationId: string,
  event: ReservationEvent,
): Promise<void> {
  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
    include: {
      unit: { select: { code: true } },
      project: { select: { name: true } },
      buyer: { select: { firstName: true, lastName: true } },
      assignedUser: { select: { id: true, email: true } },
    },
  });
  if (!reservation) return;

  const unitCode = reservation.unit.code;
  const projectName = reservation.project.name;
  const buyerName = `${reservation.buyer.firstName} ${reservation.buyer.lastName}`;
  const actionUrl = `/rezervacije/${reservation.id}`;
  const recipientUserId = reservation.assignedUserId ?? reservation.createdByUserId;
  const recipientEmail = reservation.assignedUser?.email ?? null;

  const map: Record<
    ReservationEvent,
    { title: string; category: "RESERVATION"; message: string; email: ReturnType<typeof reservationRequestedEmail> | null }
  > = {
    created: {
      title: "Nova rezervacija",
      category: "RESERVATION",
      message: `${unitCode} — ${buyerName}`,
      email: reservationRequestedEmail({ unitCode, projectName, buyerName, actionUrl }),
    },
    approved: {
      title: "Rezervacija odobrena",
      category: "RESERVATION",
      message: `${unitCode} (${projectName})`,
      email: reservationApprovedEmail({
        unitCode,
        projectName,
        expiresAt: reservation.expiresAt,
        actionUrl,
      }),
    },
    rejected: {
      title: "Rezervacija odbijena",
      category: "RESERVATION",
      message: `${unitCode} (${projectName})`,
      email: reservationRejectedEmail({
        unitCode,
        projectName,
        reason: reservation.rejectionReason,
        actionUrl,
      }),
    },
    canceled: {
      title: "Rezervacija otkazana",
      category: "RESERVATION",
      message: `${unitCode} (${projectName})`,
      email: null,
    },
    expired: {
      title: "Rezervacija istekla",
      category: "RESERVATION",
      message: `${unitCode} (${projectName})`,
      email: reservationExpiredEmail({ unitCode, projectName, actionUrl }),
    },
  };

  const spec = map[event];
  await notify({
    organizationId: reservation.organizationId,
    userId: recipientUserId,
    category: spec.category,
    title: spec.title,
    message: spec.message,
    entityType: "Reservation",
    entityId: reservation.id,
    actionUrl,
    email: spec.email && recipientEmail ? { to: recipientEmail, message: spec.email } : null,
  });
}
