import "server-only";
import type { OrganizationSubscription, SubscriptionStatus } from "@prisma/client";

import { prisma } from "@/server/db/prisma";
import { recordAudit } from "@/server/audit/audit";
import { logger } from "@/server/logger";
import { resolveBillingSettings } from "../settings/resolved.service";

/**
 * Overdue transition state machine.
 *
 * PAYMENT_DUE → PAST_DUE → RESTRICTED → SUSPENDED
 *
 * Transitions are strictly monotonic — a subscription never regresses
 * automatically. Manual reactivation is the only way to move backwards
 * (see `subscriptions.service.reactivateSubscription`).
 *
 * Timing:
 *   - PAYMENT_DUE  → set when an invoice is generated for the next period
 *   - PAST_DUE     → after `gracePeriodDays` past the invoice due date
 *   - RESTRICTED   → after `restrictedAfterDays` (only if `autoRestrictAccess`)
 *   - SUSPENDED    → after `suspendedAfterDays` (only if `autoSuspend`)
 */

export interface OverdueRunSummary {
  subscriptionsConsidered: number;
  transitioned: number;
  skipped: number;
  errors: number;
  transitions: Array<{
    organizationId: string;
    from: SubscriptionStatus;
    to: SubscriptionStatus;
  }>;
  errorDetails: Array<{ organizationId: string; error: string }>;
}

const RANK: Record<SubscriptionStatus, number> = {
  TRIAL: 0,
  ACTIVE: 1,
  PAYMENT_DUE: 2,
  PAST_DUE: 3,
  RESTRICTED: 4,
  SUSPENDED: 5,
  CANCELED: 6,
  EXPIRED: 6,
};

export async function processOverdueSubscriptions(options: {
  now?: Date;
  organizationIds?: string[];
  actorUserId?: string | null;
} = {}): Promise<OverdueRunSummary> {
  const now = options.now ?? new Date();
  const summary: OverdueRunSummary = {
    subscriptionsConsidered: 0,
    transitioned: 0,
    skipped: 0,
    errors: 0,
    transitions: [],
    errorDetails: [],
  };

  const subs = await prisma.organizationSubscription.findMany({
    where: {
      status: { in: ["PAYMENT_DUE", "PAST_DUE", "RESTRICTED"] },
      ...(options.organizationIds
        ? { organizationId: { in: options.organizationIds } }
        : {}),
    },
  });
  summary.subscriptionsConsidered = subs.length;

  for (const sub of subs) {
    try {
      const settings = await resolveBillingSettings(sub.organizationId);
      if (!settings.billingEnabled || !settings.automation.overdue) {
        summary.skipped++;
        continue;
      }

      // Determine the age of the oldest unpaid invoice for this org.
      const oldest = await prisma.invoice.findFirst({
        where: {
          organizationId: sub.organizationId,
          status: { in: ["ISSUED", "SENT", "PARTIALLY_PAID", "OVERDUE"] },
          amountDue: { gt: 0 },
          dueDate: { not: null, lte: now },
        },
        orderBy: { dueDate: "asc" },
      });
      if (!oldest || !oldest.dueDate) {
        // Nothing to transition — the tenant has no overdue invoice at all.
        summary.skipped++;
        continue;
      }

      const daysOverdue = Math.floor(
        (now.getTime() - oldest.dueDate.getTime()) / (24 * 60 * 60 * 1000),
      );

      let target: SubscriptionStatus = sub.status;
      if (daysOverdue >= 0) target = "PAST_DUE";
      if (
        settings.automation.restrictAccess &&
        daysOverdue >= settings.restrictedAfterDays
      ) {
        target = "RESTRICTED";
      }
      if (
        settings.automation.suspend &&
        daysOverdue >= settings.suspendedAfterDays
      ) {
        target = "SUSPENDED";
      }

      if (RANK[target] <= RANK[sub.status]) {
        summary.skipped++;
        continue;
      }

      await prisma.$transaction(async (tx) => {
        await tx.organizationSubscription.update({
          where: { id: sub.id },
          data: {
            status: target,
            restrictedAt: target === "RESTRICTED" ? new Date() : sub.restrictedAt,
            suspendedAt: target === "SUSPENDED" ? new Date() : sub.suspendedAt,
          },
        });
        await tx.organizationProfile.update({
          where: { organizationId: sub.organizationId },
          data: {
            status:
              target === "SUSPENDED"
                ? "SUSPENDED"
                : target === "RESTRICTED"
                  ? "RESTRICTED"
                  : "ACTIVE",
          },
        });

        // Also flip PARTIALLY_PAID / SENT invoices to OVERDUE once due date
        // has passed so that reports show correctly.
        await tx.invoice.updateMany({
          where: {
            organizationId: sub.organizationId,
            status: { in: ["ISSUED", "SENT", "PARTIALLY_PAID"] },
            amountDue: { gt: 0 },
            dueDate: { not: null, lt: now },
          },
          data: { status: "OVERDUE" },
        });
      });

      await recordAudit({
        action: "billing.overdue_transition",
        entityType: "OrganizationSubscription",
        entityId: sub.id,
        organizationId: sub.organizationId,
        actorUserId: options.actorUserId ?? null,
        previousValues: { status: sub.status },
        newValues: { status: target },
        metadata: { daysOverdue, oldestInvoiceId: oldest.id },
      });

      summary.transitioned++;
      summary.transitions.push({
        organizationId: sub.organizationId,
        from: sub.status,
        to: target,
      });
    } catch (err) {
      summary.errors++;
      summary.errorDetails.push({
        organizationId: sub.organizationId,
        error: (err as Error)?.message ?? "unknown",
      });
      logger.error("billing.overdue_failed", {
        organizationId: sub.organizationId,
        error: (err as Error)?.message,
      });
    }
  }

  return summary;
}

export type { OrganizationSubscription };
