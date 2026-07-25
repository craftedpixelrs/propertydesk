import "server-only";
import type { NotificationCategory, Prisma } from "@prisma/client";

import { prisma } from "@/server/db/prisma";
import { DomainErrors } from "@/lib/errors";
import { logger } from "@/server/logger";
import { sendEmail, type EmailMessage } from "@/server/auth/email";

/**
 * Notification service.
 *
 * Domain services (reservations, tasks, buyers, …) call `notify()` to create
 * an in-app notification for a user and, optionally, fan out an email. This is
 * the ONLY place notifications are created — never emit them from React.
 *
 * Email delivery is best-effort: a failed send is logged but never breaks the
 * originating business transaction. Notifications are created outside of the
 * caller's transaction (post-commit) so that a notification is never persisted
 * for an operation that later rolled back.
 */

export interface NotifyInput {
  organizationId?: string | null;
  userId: string;
  category: NotificationCategory;
  title: string;
  message: string;
  entityType?: string | null;
  entityId?: string | null;
  actionUrl?: string | null;
  /** When provided, an email is sent to this address using `emailMessage`. */
  email?: {
    to: string;
    message: EmailMessage;
  } | null;
}

export async function notify(input: NotifyInput): Promise<void> {
  try {
    await prisma.notification.create({
      data: {
        organizationId: input.organizationId ?? null,
        userId: input.userId,
        category: input.category,
        title: input.title,
        message: input.message,
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
        actionUrl: input.actionUrl ?? null,
      },
    });
  } catch (err) {
    logger.error("notification.create_failed", {
      userId: input.userId,
      category: input.category,
      error: (err as Error)?.message,
    });
  }

  if (input.email?.to) {
    try {
      await sendEmail({ ...input.email.message, to: input.email.to });
    } catch (err) {
      logger.error("notification.email_failed", {
        userId: input.userId,
        category: input.category,
        error: (err as Error)?.message,
      });
    }
  }
}

/** Fan out the same notification to several users (deduped). */
export async function notifyMany(
  userIds: Array<string | null | undefined>,
  base: Omit<NotifyInput, "userId">,
): Promise<void> {
  const unique = Array.from(new Set(userIds.filter((id): id is string => Boolean(id))));
  await Promise.all(unique.map((userId) => notify({ ...base, userId })));
}

export interface ListNotificationsInput {
  userId: string;
  organizationId?: string | null;
  page: number;
  pageSize: number;
  unreadOnly?: boolean;
  category?: NotificationCategory | null;
}

export async function listNotifications(input: ListNotificationsInput) {
  const where: Prisma.NotificationWhereInput = {
    userId: input.userId,
    ...(input.organizationId ? { organizationId: input.organizationId } : {}),
    ...(input.unreadOnly ? { readAt: null } : {}),
    ...(input.category ? { category: input.category } : {}),
  };

  const [total, unreadCount, rows] = await Promise.all([
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { userId: input.userId, readAt: null } }),
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (input.page - 1) * input.pageSize,
      take: input.pageSize,
    }),
  ]);

  return { items: rows, total, unreadCount };
}

export async function getUnreadCount(userId: string): Promise<number> {
  return prisma.notification.count({ where: { userId, readAt: null } });
}

export async function markNotificationRead(
  userId: string,
  notificationId: string,
): Promise<void> {
  const existing = await prisma.notification.findFirst({
    where: { id: notificationId, userId },
    select: { id: true, readAt: true },
  });
  if (!existing) throw DomainErrors.notFound("Obaveštenje");
  if (existing.readAt) return;
  await prisma.notification.update({
    where: { id: notificationId },
    data: { readAt: new Date() },
  });
}

export async function markAllNotificationsRead(userId: string): Promise<number> {
  const result = await prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
  return result.count;
}
