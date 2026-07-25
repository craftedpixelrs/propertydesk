import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Registration service tests.
 *
 * The two properties we most care about:
 *   1. Confidential duplicate messaging — when another agency already holds
 *      an active protection for the same buyer on the same project, the
 *      response NEVER names the other agency. It surfaces exactly the fixed
 *      Serbian message.
 *   2. `expireDueProtections` is idempotent — re-running the batch never
 *      double-processes rows.
 */

const prismaMock = vi.hoisted(() => ({
  project: { findFirst: vi.fn() },
  agencyConnection: { findFirst: vi.fn() },
  agencyBuyerRegistration: {
    findFirst: vi.fn(),
    create: vi.fn(),
    findMany: vi.fn(),
    updateMany: vi.fn(),
  },
  member: { findMany: vi.fn() },
}));

vi.mock("@/server/db/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/server/audit/audit", () => ({ recordAudit: vi.fn() }));
vi.mock("@/server/services/notifications.service", () => ({ notify: vi.fn() }));
vi.mock("@/server/services/buyers.service", () => ({
  createBuyer: vi.fn().mockResolvedValue({ id: "buyer-agency-1" }),
  findDuplicates: vi.fn().mockResolvedValue([]),
}));

import {
  CONFIDENTIAL_REGISTRATION_MESSAGE,
  expireDueProtections,
  registerAgencyBuyer,
} from "./registrations.service";

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.member.findMany.mockResolvedValue([]);
  prismaMock.agencyBuyerRegistration.create.mockImplementation(async ({ data }) => ({
    id: "reg-1",
    ...data,
  }));
});

describe("registerAgencyBuyer — confidential duplicate messaging", () => {
  it("returns the fixed confidential message when another agency has an active protection", async () => {
    prismaMock.project.findFirst.mockResolvedValueOnce({
      id: "proj-1",
      organizationId: "inv-1",
      name: "Test Projekat",
    });
    prismaMock.agencyConnection.findFirst.mockResolvedValueOnce({
      id: "c-1",
      investorOrganizationId: "inv-1",
      agencyOrganizationId: "agency-1",
    });
    // Simulate an existing protected registration owned by ANOTHER agency.
    prismaMock.agencyBuyerRegistration.findFirst.mockResolvedValueOnce({
      id: "other-reg",
      agencyOrganizationId: "agency-2",
      status: "APPROVED",
    });

    const result = await registerAgencyBuyer({
      agencyOrganizationId: "agency-1",
      actorUserId: "user-1",
      projectId: "proj-1",
      buyer: {
        firstName: "Ana",
        lastName: "Anić",
        phone: "+381601234567",
      },
    });

    expect(result.status).toBe("CONFLICT_REVIEW");
    expect(result.message).toBe(CONFIDENTIAL_REGISTRATION_MESSAGE);
    // The message MUST NOT mention the other agency's identifier.
    expect(result.message).not.toContain("agency-2");
  });

  it("returns PENDING when no conflict exists", async () => {
    prismaMock.project.findFirst.mockResolvedValueOnce({
      id: "proj-1",
      organizationId: "inv-1",
      name: "Test Projekat",
    });
    prismaMock.agencyConnection.findFirst.mockResolvedValueOnce({
      id: "c-1",
      investorOrganizationId: "inv-1",
      agencyOrganizationId: "agency-1",
    });
    prismaMock.agencyBuyerRegistration.findFirst.mockResolvedValueOnce(null);

    const result = await registerAgencyBuyer({
      agencyOrganizationId: "agency-1",
      actorUserId: "user-1",
      projectId: "proj-1",
      buyer: {
        firstName: "Marko",
        lastName: "Marković",
        phone: "+381691112223",
      },
    });

    expect(result.status).toBe("PENDING");
    expect(result.message).toBeUndefined();
  });
});

describe("expireDueProtections — idempotency", () => {
  it("only processes rows still in APPROVED status", async () => {
    prismaMock.agencyBuyerRegistration.findMany.mockResolvedValueOnce([
      { id: "r-1" },
      { id: "r-2" },
    ]);
    // First updateMany transitions the row; the second call (simulating a
    // concurrent worker) returns 0 rows changed because status is now EXPIRED.
    prismaMock.agencyBuyerRegistration.updateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });

    const { processed, errors } = await expireDueProtections();
    expect(processed).toBe(1);
    expect(errors).toBe(0);
  });

  it("returns zero when there is nothing to expire", async () => {
    prismaMock.agencyBuyerRegistration.findMany.mockResolvedValueOnce([]);
    const { processed, errors } = await expireDueProtections();
    expect(processed).toBe(0);
    expect(errors).toBe(0);
  });
});
