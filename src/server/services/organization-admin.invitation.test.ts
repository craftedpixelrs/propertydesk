import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  invitation: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  user: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
  },
  account: {
    create: vi.fn(),
  },
  member: {
    findFirst: vi.fn(),
    create: vi.fn(),
  },
  session: {
    updateMany: vi.fn(),
  },
}));

const loadQuotaSnapshot = vi.hoisted(() => vi.fn());
const hashPassword = vi.hoisted(() => vi.fn(async (p: string) => `hashed:${p}`));

vi.mock("@/server/db/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/server/audit/audit", () => ({ recordAudit: vi.fn() }));
vi.mock("@/server/services/quotas.service", () => ({
  loadQuotaSnapshot,
}));
vi.mock("@/server/auth/email", () => ({
  invitationEmail: vi.fn(() => ({ subject: "x", text: "y" })),
  sendEmail: vi.fn(),
}));
vi.mock("better-auth/crypto", () => ({
  hashPassword,
}));

import {
  acceptPendingInvitation,
  getPublicInvitation,
  registerFromInvitation,
} from "./organization-admin.service";
import { DomainError } from "@/lib/errors";

const pendingInvitation = {
  id: "inv-1",
  organizationId: "org-1",
  email: "marko.banovic@craftedpixel.rs",
  role: "INVESTOR_OWNER",
  status: "pending",
  expiresAt: new Date(Date.now() + 60 * 60 * 1000),
  inviterId: "owner-1",
  createdAt: new Date(),
  organization: { id: "org-1", name: "Gradnja Plus d.o.o." },
};

beforeEach(() => {
  vi.clearAllMocks();
  loadQuotaSnapshot.mockResolvedValue({
    plan: null,
    limits: { projects: null, units: null, members: null, agencies: null },
    usage: { projects: 0, units: 0, members: 1, agencies: 0 },
  });
  prismaMock.invitation.update.mockResolvedValue({});
  prismaMock.member.create.mockResolvedValue({ id: "mem-1" });
  prismaMock.session.updateMany.mockResolvedValue({ count: 1 });
  prismaMock.user.create.mockResolvedValue({ id: "user-new" });
  prismaMock.account.create.mockResolvedValue({});
});

describe("getPublicInvitation", () => {
  it("returns null when the invitation does not exist", async () => {
    prismaMock.invitation.findUnique.mockResolvedValue(null);
    await expect(getPublicInvitation("missing")).resolves.toBeNull();
  });

  it("marks pending-but-past-expiry as expired", async () => {
    prismaMock.invitation.findUnique.mockResolvedValue({
      ...pendingInvitation,
      expiresAt: new Date(Date.now() - 1000),
      organization: { name: "Gradnja Plus d.o.o." },
    });
    const result = await getPublicInvitation("inv-1");
    expect(result?.status).toBe("expired");
    expect(result?.organizationName).toBe("Gradnja Plus d.o.o.");
  });
});

describe("acceptPendingInvitation", () => {
  it("rejects a logged-in user whose email does not match", async () => {
    prismaMock.invitation.findUnique.mockResolvedValue(pendingInvitation);
    await expect(
      acceptPendingInvitation({
        invitationId: "inv-1",
        userId: "owner-1",
        userEmail: "owner@example.com",
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" } satisfies Partial<DomainError>);
    expect(prismaMock.member.create).not.toHaveBeenCalled();
  });

  it("joins the organization when the session email matches", async () => {
    prismaMock.invitation.findUnique.mockResolvedValue(pendingInvitation);
    prismaMock.user.findUnique.mockResolvedValue({
      id: "user-2",
      deactivatedAt: null,
    });
    prismaMock.member.findFirst.mockResolvedValue(null);

    await acceptPendingInvitation({
      invitationId: "inv-1",
      userId: "user-2",
      userEmail: "Marko.Banovic@craftedpixel.rs",
    });

    expect(prismaMock.member.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: "org-1",
          userId: "user-2",
          role: "INVESTOR_OWNER",
        }),
      }),
    );
    expect(prismaMock.invitation.update).toHaveBeenCalledWith({
      where: { id: "inv-1" },
      data: { status: "accepted" },
    });
    expect(prismaMock.session.updateMany).toHaveBeenCalledWith({
      where: { userId: "user-2" },
      data: { activeOrganizationId: "org-1" },
    });
  });
});

describe("registerFromInvitation", () => {
  it("refuses when an account already exists for the invited email", async () => {
    prismaMock.invitation.findUnique.mockResolvedValue(pendingInvitation);
    prismaMock.user.findFirst.mockResolvedValue({ id: "existing" });

    await expect(
      registerFromInvitation({
        invitationId: "inv-1",
        name: "Marko Banovic",
        password: "super-secret-password",
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });

  it("creates a verified account without consuming the invitation", async () => {
    prismaMock.invitation.findUnique.mockResolvedValue(pendingInvitation);
    prismaMock.user.findFirst.mockResolvedValue(null);

    const result = await registerFromInvitation({
      invitationId: "inv-1",
      name: "Marko Banovic",
      password: "super-secret-password",
    });

    expect(result.email).toBe("marko.banovic@craftedpixel.rs");
    expect(hashPassword).toHaveBeenCalledWith("super-secret-password");
    expect(prismaMock.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: "marko.banovic@craftedpixel.rs",
          name: "Marko Banovic",
          emailVerified: true,
        }),
      }),
    );
    expect(prismaMock.member.create).not.toHaveBeenCalled();
    expect(prismaMock.invitation.update).not.toHaveBeenCalled();
  });
});
