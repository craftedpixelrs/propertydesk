import "server-only";
import { prisma } from "@/server/db/prisma";
import { logger } from "@/server/logger";
import { notify } from "@/server/services/notifications.service";
import { buyerProtectionExpiredEmail } from "@/server/email/templates";

/**
 * Notify agency owners when a buyer protection is about to expire.
 *
 * Companion to `expireDueProtections` (which is the state-catch-up job).
 * This one emits one notification per registration whose protection ends
 * within `windowDays` — idempotent across runs via notification lookup.
 */
export async function notifyBuyerProtectionsExpiringSoon(input: {
  windowDays?: number;
} = {}): Promise<{ processed: number; errors: number }> {
  const windowDays = input.windowDays ?? 3;
  const now = new Date();
  const boundary = new Date(now.getTime() + windowDays * 24 * 60 * 60 * 1000);

  const registrations = await prisma.agencyBuyerRegistration.findMany({
    where: {
      status: "APPROVED",
      protectionEndsAt: { gte: now, lte: boundary },
    },
    include: {
      project: { select: { name: true } },
      buyer: { select: { firstName: true, lastName: true } },
      agencyAgent: { select: { id: true, email: true, name: true } },
    },
    take: 500,
  });

  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  let processed = 0;
  let errors = 0;

  for (const reg of registrations) {
    const agent = reg.agencyAgent;
    if (!agent) continue;
    const already = await prisma.notification.findFirst({
      where: {
        userId: agent.id,
        category: "AGENCY",
        entityType: "AgencyBuyerRegistration",
        entityId: reg.id,
        createdAt: { gte: oneDayAgo },
      },
      select: { id: true },
    });
    if (already) continue;

    try {
      const buyerName = `${reg.buyer.firstName} ${reg.buyer.lastName}`;
      const title = "Zaštita registracije uskoro ističe";
      const message = `Zaštita za kupca ${buyerName} u projektu ${reg.project.name} ističe ${reg.protectionEndsAt?.toLocaleDateString("sr-Latn-RS") ?? "uskoro"}.`;
      const actionUrl = `/moji-kupci`;
      await notify({
        organizationId: reg.agencyOrganizationId,
        userId: agent.id,
        category: "AGENCY",
        title,
        message,
        entityType: "AgencyBuyerRegistration",
        entityId: reg.id,
        actionUrl,
        email: agent.email
          ? {
              to: agent.email,
              message: {
                ...buyerProtectionExpiredEmail({
                  projectName: reg.project.name,
                  buyerName,
                  actionUrl,
                }),
                to: agent.email,
              },
            }
          : null,
      });
      processed++;
    } catch (err) {
      errors++;
      logger.error("protection.notify_failed", {
        registrationId: reg.id,
        error: (err as Error)?.message,
      });
    }
  }

  return { processed, errors };
}
