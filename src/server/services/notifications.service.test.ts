import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Notifications — the unread-count contract.
 *
 * `listNotifications` returns `unreadCount` computed from a SECOND count()
 * over `readAt: null`, independent of the pagination filter. This lets the
 * header bell show a full unread badge even when the user is browsing
 * "read only". Regressions here would silently drop the badge.
 */

const prismaMock = vi.hoisted(() => ({
  notification: {
    count: vi.fn(),
    findMany: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    create: vi.fn(),
  },
}));

vi.mock("@/server/db/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/server/auth/email", () => ({ sendEmail: vi.fn() }));

import {
  listNotifications,
  getUnreadCount,
  markAllNotificationsRead,
} from "./notifications.service";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("listNotifications", () => {
  it("returns unreadCount from an unfiltered count independent of unreadOnly", async () => {
    prismaMock.notification.count
      .mockResolvedValueOnce(5)
      .mockResolvedValueOnce(2);
    prismaMock.notification.findMany.mockResolvedValue([]);

    const result = await listNotifications({
      userId: "u1",
      page: 1,
      pageSize: 30,
      unreadOnly: false,
    });

    expect(result.total).toBe(5);
    expect(result.unreadCount).toBe(2);
  });

  it("still returns full unreadCount when unreadOnly=true", async () => {
    prismaMock.notification.count
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(2);
    prismaMock.notification.findMany.mockResolvedValue([]);

    const result = await listNotifications({
      userId: "u1",
      page: 1,
      pageSize: 30,
      unreadOnly: true,
    });

    expect(result.total).toBe(2);
    expect(result.unreadCount).toBe(2);
    // The unread-only filter must not accidentally bleed into the second
    // count: the second call receives the plain userId+readAt:null query.
    const secondCall = prismaMock.notification.count.mock.calls[1]?.[0];
    expect(secondCall).toEqual({ where: { userId: "u1", readAt: null } });
  });

  it("applies category filter without corrupting unreadCount", async () => {
    prismaMock.notification.count
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(4);
    prismaMock.notification.findMany.mockResolvedValue([]);

    const result = await listNotifications({
      userId: "u1",
      page: 1,
      pageSize: 30,
      category: "PAYMENT",
    });
    expect(result.total).toBe(3);
    expect(result.unreadCount).toBe(4);
    const firstCall = prismaMock.notification.count.mock.calls[0]?.[0] as {
      where: Record<string, unknown>;
    };
    expect(firstCall.where.category).toBe("PAYMENT");
  });
});

describe("getUnreadCount", () => {
  it("counts readAt-null rows for the given user", async () => {
    prismaMock.notification.count.mockResolvedValue(7);
    const n = await getUnreadCount("u1");
    expect(n).toBe(7);
    expect(prismaMock.notification.count).toHaveBeenCalledWith({
      where: { userId: "u1", readAt: null },
    });
  });
});

describe("markAllNotificationsRead", () => {
  it("bulk-updates only unread rows and returns count", async () => {
    prismaMock.notification.updateMany.mockResolvedValue({ count: 4 });
    const affected = await markAllNotificationsRead("u1");
    expect(affected).toBe(4);
    const [args] = prismaMock.notification.updateMany.mock.calls[0] ?? [];
    expect(args?.where).toEqual({ userId: "u1", readAt: null });
    expect(args?.data).toMatchObject({ readAt: expect.any(Date) });
  });
});
