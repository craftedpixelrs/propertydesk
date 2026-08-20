import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  organization: {
    findUnique: vi.fn(),
  },
  saaSPlan: {
    findUnique: vi.fn(),
  },
  organizationSubscription: {
    findMany: vi.fn(),
    update: vi.fn(),
  },
  organizationProfile: {
    updateMany: vi.fn(),
  },
  $transaction: vi.fn(),
}));

vi.mock("@/server/db/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/server/audit/audit", () => ({
  recordAudit: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/server/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn() },
}));

import {
  expireEndedSubscriptions,
  expiryReasonForSubscription,
  syncExpiredAccess,
} from "./expire.service";

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.$transaction.mockImplementation(async (fn: (tx: typeof prismaMock) => Promise<void>) =>
    fn(prismaMock),
  );
  prismaMock.organizationSubscription.update.mockResolvedValue({});
  prismaMock.organizationProfile.updateMany.mockResolvedValue({ count: 1 });
  prismaMock.saaSPlan.findUnique.mockResolvedValue(null);
});

const now = new Date("2026-08-16T12:00:00.000Z");

describe("expiryReasonForSubscription", () => {
  it("expires a trial whose trialEndsAt is in the past", () => {
    expect(
      expiryReasonForSubscription(
        {
          status: "TRIAL",
          trialEndsAt: new Date("2026-08-01T00:00:00.000Z"),
          endsAt: null,
          currentPeriodEnd: null,
        },
        now,
      ),
    ).toBe("trial");
  });

  it("does not expire an active trial", () => {
    expect(
      expiryReasonForSubscription(
        {
          status: "TRIAL",
          trialEndsAt: new Date("2026-09-01T00:00:00.000Z"),
          endsAt: null,
          currentPeriodEnd: null,
        },
        now,
      ),
    ).toBeNull();
  });

  it("expires a paid period past currentPeriodEnd", () => {
    expect(
      expiryReasonForSubscription(
        {
          status: "ACTIVE",
          trialEndsAt: null,
          endsAt: null,
          currentPeriodEnd: new Date("2026-08-01T00:00:00.000Z"),
        },
        now,
      ),
    ).toBe("period");
  });

  it("leaves already-locked subscriptions alone", () => {
    expect(
      expiryReasonForSubscription(
        {
          status: "EXPIRED",
          trialEndsAt: new Date("2026-01-01T00:00:00.000Z"),
          endsAt: null,
          currentPeriodEnd: null,
        },
        now,
      ),
    ).toBeNull();
  });
});

describe("expireEndedSubscriptions", () => {
  it("persists EXPIRED + RESTRICTED for an ended trial", async () => {
    prismaMock.organizationSubscription.findMany.mockResolvedValue([
      {
        id: "sub-1",
        organizationId: "org-1",
        status: "TRIAL",
        trialEndsAt: new Date("2026-08-01T00:00:00.000Z"),
        endsAt: null,
        currentPeriodEnd: null,
      },
    ]);

    const result = await expireEndedSubscriptions({ now });
    expect(result.processed).toBe(1);
    expect(result.errors).toBe(0);
    expect(prismaMock.organizationSubscription.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "sub-1" },
        data: expect.objectContaining({ status: "EXPIRED" }),
      }),
    );
    expect(prismaMock.organizationProfile.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { organizationId: "org-1" },
        data: { status: "RESTRICTED" },
      }),
    );
  });

  it("skips agency partner orgs", async () => {
    prismaMock.organizationSubscription.findMany.mockResolvedValue([
      {
        id: "sub-agency",
        organizationId: "org-agency",
        status: "TRIAL",
        trialEndsAt: new Date("2026-08-01T00:00:00.000Z"),
        endsAt: null,
        currentPeriodEnd: null,
        organization: { profile: { type: "AGENCY" } },
      },
    ]);

    const result = await expireEndedSubscriptions({ now });
    expect(result.processed).toBe(0);
    expect(prismaMock.organizationSubscription.update).not.toHaveBeenCalled();
  });
});

describe("syncExpiredAccess", () => {
  it("heals a restricted agency back to ACTIVE without locking", async () => {
    prismaMock.organization.findUnique.mockResolvedValue({
      profile: { status: "RESTRICTED", type: "AGENCY" },
      subscription: {
        id: "sub-agency",
        status: "EXPIRED",
        trialEndsAt: new Date("2026-08-01T00:00:00.000Z"),
        endsAt: null,
        currentPeriodEnd: null,
        plan: { id: "plan-starter", code: "starter" },
      },
    });
    prismaMock.saaSPlan.findUnique.mockResolvedValue({
      id: "plan-partner",
      code: "partner",
    });

    await expect(syncExpiredAccess("org-agency", now)).resolves.toBe("ACTIVE");
    expect(prismaMock.organizationProfile.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ organizationId: "org-agency" }),
        data: { status: "ACTIVE" },
      }),
    );
    expect(prismaMock.organizationSubscription.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { organizationId: "org-agency" },
        data: expect.objectContaining({
          status: "ACTIVE",
          trialEndsAt: null,
          planId: "plan-partner",
        }),
      }),
    );
  });
});
