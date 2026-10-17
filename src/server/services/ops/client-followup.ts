import "server-only";

import { Prisma } from "@prisma/client";

import { appOrigin } from "@/server/http/app-origin";
import { toDecimal } from "@/lib/formatters/money";
import { logger } from "@/server/logger";
import { prisma } from "@/server/db/prisma";
import {
  buyerInstallmentReminderEmail,
  buyerReservationExpiringEmail,
} from "@/server/email/templates";
import { messageExtra, sendBuyerNoticeOnce } from "@/server/services/messaging/buyer-mail.service";

async function ensureTask(input: {
  organizationId: string;
  sourceKey: string;
  title: string;
  description: string;
  assignedUserId: string;
  buyerId?: string | null;
  projectId?: string | null;
  unitId?: string | null;
  dueAt: Date;
}) {
  try {
    await prisma.task.create({
      data: {
        organizationId: input.organizationId,
        sourceKey: input.sourceKey,
        title: input.title,
        description: input.description,
        assignedUserId: input.assignedUserId,
        createdByUserId: input.assignedUserId,
        buyerId: input.buyerId ?? null,
        projectId: input.projectId ?? null,
        unitId: input.unitId ?? null,
        dueAt: input.dueAt,
        priority: "HIGH",
      },
    });
    return true;
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return false;
    }
    throw err;
  }
}

/**
 * Daily follow-up: buyer emails and one task per upcoming deadline.
 * Safe to run more than once.
 */
export async function runClientFollowUp(): Promise<{ processed: number; errors: number }> {
  const now = new Date();
  const inSeven = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const inTwo = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
  let processed = 0;
  let errors = 0;

  const installments = await prisma.paymentInstallment.findMany({
    where: {
      status: { in: ["UPCOMING", "DUE", "PARTIALLY_PAID"] },
      dueDate: { gte: now, lte: inSeven },
    },
    take: 400,
    include: {
      paymentPlan: {
        include: {
          sale: {
            include: {
              unit: { select: { id: true, code: true } },
              project: { select: { id: true, name: true } },
              buyer: { select: { id: true, firstName: true, lastName: true, email: true } },
              responsibleUser: { select: { id: true } },
            },
          },
        },
      },
    },
  });

  for (const inst of installments) {
    const sale = inst.paymentPlan.sale;
    try {
      const extra = await messageExtra(sale.organizationId, "installment_reminder");
      const outstanding = toDecimal(inst.amount).minus(toDecimal(inst.paidAmount));
      const sent = await sendBuyerNoticeOnce({
        organizationId: sale.organizationId,
        buyerId: sale.buyer.id,
        kind: "installment_due",
        entityId: inst.id,
        email: sale.buyer.email,
        message: buyerInstallmentReminderEmail({
          buyerName: `${sale.buyer.firstName} ${sale.buyer.lastName}`,
          unitCode: sale.unit.code,
          projectName: sale.project.name,
          installmentName: inst.name,
          amount: outstanding.toString(),
          currency: inst.paymentPlan.currency,
          dueOn: inst.dueDate.toLocaleDateString("sr-Latn-RS"),
          extra,
        }),
      });
      const tasked = await ensureTask({
        organizationId: sale.organizationId,
        sourceKey: `installment-due:${inst.id}`,
        title: `Rata dospeva · ${sale.unit.code}`,
        description: `${inst.name} · ${outstanding.toString()} ${inst.paymentPlan.currency}`,
        assignedUserId: sale.responsibleUserId,
        buyerId: sale.buyer.id,
        projectId: sale.project.id,
        unitId: sale.unit.id,
        dueAt: inst.dueDate,
      });
      if (sent || tasked) processed++;
    } catch (err) {
      errors++;
      logger.error("followup.installment_failed", {
        installmentId: inst.id,
        error: (err as Error)?.message,
      });
    }
  }

  const reservations = await prisma.reservation.findMany({
    where: {
      status: "APPROVED",
      expiresAt: { gte: now, lte: inTwo },
    },
    take: 400,
    include: {
      unit: { select: { id: true, code: true } },
      project: { select: { id: true, name: true } },
      buyer: { select: { id: true, firstName: true, lastName: true, email: true } },
      assignedUser: { select: { id: true } },
      createdByUser: { select: { id: true } },
    },
  });

  for (const reservation of reservations) {
    if (!reservation.expiresAt) continue;
    const assignee = reservation.assignedUser?.id ?? reservation.createdByUser.id;
    try {
      const extra = await messageExtra(reservation.organizationId, "reservation_expiring");
      const sent = await sendBuyerNoticeOnce({
        organizationId: reservation.organizationId,
        buyerId: reservation.buyer.id,
        kind: "reservation_expiring",
        entityId: reservation.id,
        email: reservation.buyer.email,
        message: buyerReservationExpiringEmail({
          buyerName: `${reservation.buyer.firstName} ${reservation.buyer.lastName}`,
          unitCode: reservation.unit.code,
          projectName: reservation.project.name,
          expiresOn: reservation.expiresAt.toLocaleDateString("sr-Latn-RS"),
          extra,
        }),
      });
      const tasked = await ensureTask({
        organizationId: reservation.organizationId,
        sourceKey: `reservation-expiry:${reservation.id}`,
        title: `Rezervacija ističe · ${reservation.unit.code}`,
        description: `${reservation.buyer.firstName} ${reservation.buyer.lastName}`,
        assignedUserId: assignee,
        buyerId: reservation.buyer.id,
        projectId: reservation.project.id,
        unitId: reservation.unit.id,
        dueAt: reservation.expiresAt,
      });
      if (sent || tasked) processed++;
    } catch (err) {
      errors++;
      logger.error("followup.reservation_failed", {
        reservationId: reservation.id,
        error: (err as Error)?.message,
      });
    }
  }

  return { processed, errors };
}

export function buyerPortalUrl(token: string): string {
  return `${appOrigin()}/p/kupac/${token}`;
}
