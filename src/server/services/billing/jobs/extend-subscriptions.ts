import "server-only";
import { prisma } from "@/server/db/prisma";
import { logger } from "@/server/logger";
import { recordAudit } from "@/server/audit/audit";
import { addCycle } from "../subscriptions.service";

/**
 * Reconciles subscription periods for PAID invoices whose payment path
 * didn't fire the standard extension record. This is a safety net for:
 *   - imported/legacy PAID invoices,
 *   - partial rollbacks that landed the invoice as PAID without extending
 *     the subscription.
 *
 * Idempotency: unique index `(subscriptionId, invoiceId)` on
 * `subscription_extension` guarantees a single extension per invoice.
 */

export interface ExtendReconcileSummary {
  considered: number;
  extended: number;
  errors: number;
  skipped: number;
}

export async function reconcileSubscriptionExtensions(now: Date = new Date()): Promise<ExtendReconcileSummary> {
  const summary: ExtendReconcileSummary = {
    considered: 0,
    extended: 0,
    errors: 0,
    skipped: 0,
  };

  const paidInvoices = await prisma.invoice.findMany({
    where: {
      status: "PAID",
      subscriptionId: { not: null },
      servicePeriodEnd: { not: null },
      subscription: { autoRenew: true },
    },
    include: {
      subscription: {
        select: {
          id: true,
          organizationId: true,
          billingCycle: true,
          currentPeriodEnd: true,
          status: true,
          autoRenew: true,
        },
      },
    },
    take: 500,
    orderBy: { paidAt: "asc" },
  });
  summary.considered = paidInvoices.length;

  for (const inv of paidInvoices) {
    if (!inv.subscription || !inv.servicePeriodEnd) {
      summary.skipped++;
      continue;
    }
    try {
      const existing = await prisma.subscriptionExtension.findUnique({
        where: {
          subscriptionId_invoiceId: {
            subscriptionId: inv.subscription.id,
            invoiceId: inv.id,
          },
        },
      });
      if (existing) {
        summary.skipped++;
        continue;
      }

      const from = inv.servicePeriodStart ?? inv.subscription.currentPeriodEnd ?? now;
      const to = inv.servicePeriodEnd ?? addCycle(from, inv.subscription.billingCycle);

      await prisma.$transaction(async (tx) => {
        await tx.subscriptionExtension.create({
          data: {
            organizationId: inv.subscription!.organizationId,
            subscriptionId: inv.subscription!.id,
            invoiceId: inv.id,
            extendedFrom: from,
            extendedTo: to,
            cycle: inv.subscription!.billingCycle,
          },
        });
        // Advance the subscription only if it hasn't already passed this point.
        if (
          !inv.subscription!.currentPeriodEnd ||
          inv.subscription!.currentPeriodEnd < to
        ) {
          await tx.organizationSubscription.update({
            where: { id: inv.subscription!.id },
            data: {
              currentPeriodStart: from,
              currentPeriodEnd: to,
              nextBillingDate: to,
              status:
                inv.subscription!.status === "SUSPENDED" ||
                inv.subscription!.status === "CANCELED"
                  ? inv.subscription!.status
                  : "ACTIVE",
            },
          });
        }
      });

      await recordAudit({
        action: "billing.subscription_extended",
        entityType: "OrganizationSubscription",
        entityId: inv.subscription.id,
        organizationId: inv.subscription.organizationId,
        metadata: {
          invoiceId: inv.id,
          extendedFrom: from,
          extendedTo: to,
          reason: "reconcile",
        },
      });
      summary.extended++;
    } catch (err) {
      summary.errors++;
      logger.error("billing.extend_reconcile_failed", {
        invoiceId: inv.id,
        error: (err as Error)?.message,
      });
    }
  }

  return summary;
}
