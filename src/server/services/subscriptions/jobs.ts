import "server-only";
import { prisma } from "@/server/db/prisma";
import { logger } from "@/server/logger";
import { notify } from "@/server/services/notifications.service";
import { trialExpiringEmail } from "@/server/email/templates";

/**
 * Trial-expiration notification cron.
 *
 * Runs daily; scans `OrganizationSubscription` rows in `TRIAL` status whose
 * `trialEndsAt` is within `windowDays` days. For each match, emits one
 * in-app + email notification to each owner-role member of the organization
 * — but only once per (subscription, windowBucket). Idempotency is enforced
 * by matching a notification of the same entityId+category within the last
 * 24h window.
 */
export async function notifyTrialsExpiring(input: { windowDays?: number } = {}): Promise<{
  processed: number;
  errors: number;
}> {
  const windowDays = input.windowDays ?? 7;
  const now = new Date();
  const boundary = new Date(now.getTime() + windowDays * 24 * 60 * 60 * 1000);

  const subs = await prisma.organizationSubscription.findMany({
    where: {
      status: "TRIAL",
      trialEndsAt: { gte: now, lte: boundary },
    },
    include: {
      organization: {
        select: {
          id: true,
          name: true,
          members: {
            where: { role: { in: ["INVESTOR_OWNER", "AGENCY_OWNER"] } },
            include: { user: { select: { id: true, email: true, name: true } } },
          },
        },
      },
    },
    take: 500,
  });

  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  let processed = 0;
  let errors = 0;

  for (const sub of subs) {
    const trialEndsAt = sub.trialEndsAt;
    if (!trialEndsAt) continue;
    for (const member of sub.organization.members) {
      const already = await prisma.notification.findFirst({
        where: {
          userId: member.userId,
          category: "SYSTEM",
          entityType: "OrganizationSubscription",
          entityId: sub.id,
          createdAt: { gte: oneDayAgo },
        },
        select: { id: true },
      });
      if (already) continue;

      try {
        const title = "Vaš probni period uskoro ističe";
        const message = `Probni period za organizaciju "${sub.organization.name}" ističe ${trialEndsAt.toLocaleDateString("sr-Latn-RS")}. Da biste izbegli suspenziju, kontaktirajte administratora ili obnovite pretplatu.`;
        const actionUrl = "/podesavanja/pretplata";
        await notify({
          organizationId: sub.organization.id,
          userId: member.userId,
          category: "SYSTEM",
          title,
          message,
          entityType: "OrganizationSubscription",
          entityId: sub.id,
          actionUrl,
          email: member.user.email
            ? {
                to: member.user.email,
                message: {
                  ...trialExpiringEmail({
                    organizationName: sub.organization.name,
                    trialEndsAt,
                    actionUrl,
                  }),
                  to: member.user.email,
                },
              }
            : null,
        });
        processed++;
      } catch (err) {
        errors++;
        logger.error("trial.notify_failed", {
          subscriptionId: sub.id,
          userId: member.userId,
          error: (err as Error)?.message,
        });
      }
    }
  }

  return { processed, errors };
}
