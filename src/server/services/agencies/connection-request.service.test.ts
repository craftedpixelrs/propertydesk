import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  organizationProfile: { findUnique: vi.fn() },
  organization: { findUnique: vi.fn() },
  project: { count: vi.fn(), findFirst: vi.fn() },
  agencyConnection: { findFirst: vi.fn() },
  agencyConnectionRequest: { findFirst: vi.fn(), create: vi.fn() },
  member: { findMany: vi.fn() },
}));

vi.mock("@/server/db/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/server/audit/audit", () => ({ recordAudit: vi.fn() }));
vi.mock("@/server/auth/email", () => ({
  agencyConnectionRequestReceivedEmail: vi.fn(() => ({ subject: "x", text: "y", to: "" })),
  agencyConnectionRequestReviewedEmail: vi.fn(() => ({ subject: "x", text: "y", to: "" })),
  sendEmail: vi.fn(),
}));
vi.mock("@/lib/env", () => ({ serverEnv: { BETTER_AUTH_URL: "http://localhost:3000" } }));
vi.mock("@/server/services/agencies/agencies.service", () => ({
  ensureUniqueReferralCode: vi.fn(),
  grantProjectAccess: vi.fn(),
}));

import { createConnectionRequest } from "./connection-request.service";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createConnectionRequest", () => {
  it("blocks unverified agencies", async () => {
    prismaMock.organizationProfile.findUnique.mockResolvedValueOnce({
      type: "AGENCY",
      status: "ACTIVE",
      verificationStatus: "PENDING",
    });
    await expect(
      createConnectionRequest({
        agencyOrganizationId: "agy-1",
        actorUserId: "u1",
        investorOrganizationId: "inv-1",
      }),
    ).rejects.toThrow(/verifikuje/);
  });

  it("blocks when the investor has no catalog projects", async () => {
    prismaMock.organizationProfile.findUnique.mockResolvedValueOnce({
      type: "AGENCY",
      status: "ACTIVE",
      verificationStatus: "VERIFIED",
    });
    prismaMock.organization.findUnique.mockResolvedValueOnce({
      id: "inv-1",
      profile: { type: "INVESTOR", status: "ACTIVE" },
    });
    prismaMock.project.count.mockResolvedValueOnce(0);
    await expect(
      createConnectionRequest({
        agencyOrganizationId: "agy-1",
        actorUserId: "u1",
        investorOrganizationId: "inv-1",
      }),
    ).rejects.toThrow(/nije otvorio/);
  });
});
