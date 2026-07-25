import "server-only";
import { prisma } from "@/server/db/prisma";
import { logger } from "@/server/logger";
import { toDecimal } from "@/lib/formatters/money";
import { notify } from "@/server/services/notifications.service";
import { propagatePlanStatusFromInstallments } from "@/server/services/sales/payment-plans.service";
import { genericNotificationEmail } from "@/server/email/templates";

/**
 * Installment-lifecycle cron helpers.
 *
 * `markInstallmentsOverdue` runs daily: any UPCOMING / DUE / PARTIALLY_PAID
 * installment whose `dueDate` is in the past AND still has an outstanding
 * balance is flipped to OVERDUE. This is a pure state-catch-up: it never
 * emits customer-facing notifications by itself (those go via the
 * `due-soon-notifications` job).
 *
 * `notifyDueSoonInstallments` runs daily and produces one notification per
 * installment that is DUE within the next `windowDays` days AND has not
 * already been notified (tracked implicitly by matching entityId+category
 * within the past window).
 */

export async function markInstallmentsOverdue(): Promise<{ processed: number; errors: number }> {
  const now = new Date();
  const candidates = await prisma.paymentInstallment.findMany({
    where: {
      dueDate: { lt: now },
      status: { in: ["UPCOMING", "DUE", "PARTIALLY_PAID"] },
    },
    select: { id: true, paymentPlanId: true, amount: true, paidAmount: true },
    take: 500,
  });

  let processed = 0;
  let errors = 0;
  const touchedPlanIds = new Set<string>();

  for (const inst of candidates) {
    const outstanding = toDecimal(inst.amount).minus(toDecimal(inst.paidAmount));
    if (outstanding.lte(0)) continue;
    try {
      await prisma.paymentInstallment.update({
        where: { id: inst.id },
        data: { status: "OVERDUE" },
      });
      touchedPlanIds.add(inst.paymentPlanId);
      processed++;
    } catch (err) {
      errors++;
      logger.error("installment.overdue_failed", {
        installmentId: inst.id,
        error: (err as Error)?.message,
      });
    }
  }

  // Re-run status propagation once per plan touched.
  for (const planId of touchedPlanIds) {
    try {
      await prisma.$transaction(async (tx) => {
        await propagatePlanStatusFromInstallments({
          tx,
          paymentPlanId: planId,
        });
      });
    } catch (err) {
      logger.error("installment.plan_propagation_failed", {
        planId,
        error: (err as Error)?.message,
      });
    }
  }

  return { processed, errors };
}

export async function notifyDueSoonInstallments(input: { windowDays?: number } = {}): Promise<{
  processed: number;
  errors: number;
}> {
  const windowDays = input.windowDays ?? 7;
  const now = new Date();
  const boundary = new Date(now.getTime() + windowDays * 24 * 60 * 60 * 1000);

  const installments = await prisma.paymentInstallment.findMany({
    where: {
      status: { in: ["UPCOMING", "DUE", "PARTIALLY_PAID"] },
      dueDate: { gte: now, lte: boundary },
    },
    include: {
      paymentPlan: {
        include: {
          sale: {
            include: {
              unit: { select: { code: true } },
              responsibleUser: { select: { id: true, email: true, name: true } },
              buyer: { select: { firstName: true, lastName: true } },
            },
          },
        },
      },
    },
    take: 500,
  });

  let processed = 0;
  let errors = 0;

  for (const inst of installments) {
    const sale = inst.paymentPlan.sale;
    const responsibleUser = sale.responsibleUser;
    if (!responsibleUser) continue;

    // Idempotency: skip if we already emitted a notification for this
    // installment. Notifications are the source of truth here since we
    // don't have a dedicated log table.
    const already = await prisma.notification.findFirst({
      where: {
        userId: responsibleUser.id,
        category: "PAYMENT",
        entityType: "PaymentInstallment",
        entityId: inst.id,
      },
      select: { id: true },
    });
    if (already) continue;

    try {
      const title = "Rata uskoro dospeva";
      const dueOn = inst.dueDate.toLocaleDateString("sr-Latn-RS");
      const message = `Rata "${inst.name}" (${toDecimal(inst.amount).toString()} ${inst.paymentPlan.currency}) za jedinicu ${sale.unit.code} dospeva ${dueOn}.`;
      const actionUrl = `/prodaje/${sale.id}/plan-placanja`;
      await notify({
        organizationId: inst.paymentPlan.organizationId,
        userId: responsibleUser.id,
        category: "PAYMENT",
        title,
        message,
        entityType: "PaymentInstallment",
        entityId: inst.id,
        actionUrl,
        email: responsibleUser.email
          ? {
              to: responsibleUser.email,
              message: {
                ...genericNotificationEmail({ title, message, actionUrl }),
                to: responsibleUser.email,
              },
            }
          : null,
      });
      processed++;
    } catch (err) {
      errors++;
      logger.error("installment.notify_failed", {
        installmentId: inst.id,
        error: (err as Error)?.message,
      });
    }
  }

  return { processed, errors };
}
