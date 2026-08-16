import "server-only";
import type { OrganizationStatus, SubscriptionStatus } from "@prisma/client";

import { prisma } from "@/server/db/prisma";
import { recordAudit } from "@/server/audit/audit";
import { logger } from "@/server/logger";

export type ExpiryReason = "trial" | "period";

const ALREADY_LOCKED: SubscriptionStatus[] = [
  "RESTRICTED",
  "SUSPENDED",
  "CANCELED",
  "EXPIRED",
];

export function expiryReasonForSubscription(
  sub: {
    status: SubscriptionStatus;
    trialEndsAt: Date | null;
    endsAt: Date | null;
    currentPeriodEnd: Date | null;
  },
  now: Date,
): ExpiryReason | null {
  if (ALREADY_LOCKED.includes(sub.status)) return null;

  if (
    sub.status === "TRIAL" &&
    sub.trialEndsAt &&
    sub.trialEndsAt.getTime() <= now.getTime()
  ) {
    return "trial";
  }

  if (sub.endsAt && sub.endsAt.getTime() <= now.getTime()) {
    return "period";
  }

  if (
    (sub.status === "ACTIVE" ||
      sub.status === "PAYMENT_DUE" ||
      sub.status === "PAST_DUE") &&
    sub.currentPeriodEnd &&
    sub.currentPeriodEnd.getTime() <= now.getTime()
  ) {
    return "period";
  }

  return null;
}

function targetStatuses(reason: ExpiryReason): {
  subscriptionStatus: SubscriptionStatus;
  organizationStatus: OrganizationStatus;
} {
  if (reason === "trial") {
    return { subscriptionStatus: "EXPIRED", organizationStatus: "RESTRICTED" };
  }
  return { subscriptionStatus: "RESTRICTED", organizationStatus: "RESTRICTED" };
}

async function persistExpiry(
  organizationId: string,
  subscriptionId: string,
  previousStatus: SubscriptionStatus,
  reason: ExpiryReason,
): Promise<void> {
  const { subscriptionStatus, organizationStatus } = targetStatuses(reason);
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.organizationSubscription.update({
      where: { id: subscriptionId },
      data: {
        status: subscriptionStatus,
        restrictedAt: now,
      },
    });
    await tx.organizationProfile.updateMany({
      where: { organizationId },
      data: { status: organizationStatus },
    });
  });

  await recordAudit({
    action: "billing.subscription_expired",
    entityType: "OrganizationSubscription",
    entityId: subscriptionId,
    organizationId,
    actorUserId: null,
    previousValues: { status: previousStatus },
    newValues: { status: subscriptionStatus },
    metadata: { reason },
  });
}

/**
 * If this org's trial or paid period has ended, persist RESTRICTED/EXPIRED
 * and return the effective organization status. Safe to call on every request.
 */
export async function syncExpiredAccess(
  organizationId: string,
  now: Date = new Date(),
): Promise<OrganizationStatus | null> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      profile: { select: { status: true } },
      subscription: {
        select: {
          id: true,
          status: true,
          trialEndsAt: true,
          endsAt: true,
          currentPeriodEnd: true,
        },
      },
    },
  });
  if (!org) return null;

  const sub = org.subscription;
  if (!sub) return org.profile?.status ?? null;

  const reason = expiryReasonForSubscription(sub, now);
  if (!reason) return org.profile?.status ?? null;

  try {
    await persistExpiry(organizationId, sub.id, sub.status, reason);
  } catch (err) {
    logger.error("subscription.expire_persist_failed", {
      organizationId,
      error: (err as Error)?.message,
    });
  }

  return "RESTRICTED";
}

export async function expireEndedSubscriptions(input: {
  now?: Date;
  organizationId?: string;
} = {}): Promise<{ processed: number; errors: number }> {
  const now = input.now ?? new Date();

  const subs = await prisma.organizationSubscription.findMany({
    where: {
      status: { in: ["TRIAL", "ACTIVE", "PAYMENT_DUE", "PAST_DUE"] },
      ...(input.organizationId ? { organizationId: input.organizationId } : {}),
      OR: [
        { status: "TRIAL", trialEndsAt: { lte: now } },
        { endsAt: { lte: now } },
        {
          status: { in: ["ACTIVE", "PAYMENT_DUE", "PAST_DUE"] },
          currentPeriodEnd: { lte: now },
        },
      ],
    },
    select: {
      id: true,
      organizationId: true,
      status: true,
      trialEndsAt: true,
      endsAt: true,
      currentPeriodEnd: true,
    },
    take: 500,
  });

  let processed = 0;
  let errors = 0;

  for (const sub of subs) {
    const reason = expiryReasonForSubscription(sub, now);
    if (!reason) continue;
    try {
      await persistExpiry(sub.organizationId, sub.id, sub.status, reason);
      processed++;
    } catch (err) {
      errors++;
      logger.error("subscription.expire_failed", {
        organizationId: sub.organizationId,
        error: (err as Error)?.message,
      });
    }
  }

  return { processed, errors };
}
