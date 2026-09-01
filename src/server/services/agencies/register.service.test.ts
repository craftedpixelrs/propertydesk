import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  user: { findFirst: vi.fn(), create: vi.fn() },
  organizationProfile: { findFirst: vi.fn(), create: vi.fn() },
  saaSPlan: { findUnique: vi.fn() },
  organization: { findUnique: vi.fn(), create: vi.fn() },
  organizationSubscription: { create: vi.fn() },
  account: { create: vi.fn() },
  member: { create: vi.fn() },
  $transaction: vi.fn(),
}));

vi.mock("@/server/db/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/server/audit/audit", () => ({ recordAudit: vi.fn() }));
vi.mock("better-auth/crypto", () => ({ hashPassword: vi.fn(async () => "hashed") }));

import { registerAgency } from "./register.service";

const valid = {
  ownerName: "Ana Anić",
  email: "ana@top.rs",
  password: "supersecret1",
  displayName: "Top Nekretnine",
  legalName: "Top Nekretnine d.o.o.",
  taxNumber: "123456789",
  registrationNumber: "07000001",
  address: "Knez Mihailova 1",
  city: "Beograd",
  postalCode: "11000",
  phone: "+38160111222",
};

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.$transaction.mockImplementation(async (fn: (tx: typeof prismaMock) => unknown) =>
    fn(prismaMock),
  );
});

describe("registerAgency", () => {
  it("rejects a duplicate email", async () => {
    prismaMock.user.findFirst.mockResolvedValueOnce({ id: "u1" });
    await expect(registerAgency(valid)).rejects.toThrow(/već postoji/);
  });

  it("creates a PENDING partner agency", async () => {
    prismaMock.user.findFirst.mockResolvedValueOnce(null);
    prismaMock.organizationProfile.findFirst.mockResolvedValue(null);
    prismaMock.saaSPlan.findUnique.mockResolvedValueOnce({
      id: "plan-partner",
      active: true,
      currency: "EUR",
    });
    prismaMock.organization.findUnique.mockResolvedValueOnce(null);

    const result = await registerAgency(valid);
    expect(result.email).toBe("ana@top.rs");
    expect(prismaMock.organizationProfile.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: "AGENCY",
          verificationStatus: "PENDING",
          status: "ACTIVE",
          taxNumber: "123456789",
        }),
      }),
    );
    expect(prismaMock.member.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ role: "AGENCY_OWNER" }),
      }),
    );
  });
});
