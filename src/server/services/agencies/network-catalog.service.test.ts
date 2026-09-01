import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  organizationProfile: { findUnique: vi.fn() },
  project: { findMany: vi.fn() },
  agencyConnection: { findMany: vi.fn() },
  agencyConnectionRequest: { findMany: vi.fn() },
  unit: { groupBy: vi.fn() },
}));

vi.mock("@/server/db/prisma", () => ({ prisma: prismaMock }));

import { listNetworkCatalog } from "./network-catalog.service";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("listNetworkCatalog", () => {
  it("rejects non-agency orgs", async () => {
    prismaMock.organizationProfile.findUnique.mockResolvedValueOnce({
      type: "INVESTOR",
      status: "ACTIVE",
    });
    await expect(
      listNetworkCatalog({ agencyOrganizationId: "inv-1" }),
    ).rejects.toThrow(/samo agencijama/i);
  });

  it("returns teasers without inventing unit rows", async () => {
    prismaMock.organizationProfile.findUnique.mockResolvedValueOnce({
      type: "AGENCY",
      status: "ACTIVE",
    });
    prismaMock.project.findMany.mockResolvedValueOnce([
      {
        id: "p1",
        name: "Residence Park",
        city: "Beograd",
        municipality: "Novi Beograd",
        coverImageUrl: null,
        expectedCompletionDate: null,
        defaultCurrency: "EUR",
        organizationId: "inv-1",
        organization: { name: "Gradnja Plus", profile: { displayName: "Gradnja Plus" } },
      },
    ]);
    prismaMock.agencyConnection.findMany.mockResolvedValueOnce([]);
    prismaMock.agencyConnectionRequest.findMany.mockResolvedValueOnce([]);
    prismaMock.unit.groupBy.mockResolvedValueOnce([
      {
        projectId: "p1",
        type: "APARTMENT",
        status: "AVAILABLE",
        _count: { _all: 4 },
        _min: { finalPrice: { toFixed: () => "120000.00", lt: () => false }, basePrice: null },
        _max: { finalPrice: { toFixed: () => "210000.00", gt: () => false }, basePrice: null },
      },
    ]);

    const items = await listNetworkCatalog({ agencyOrganizationId: "agy-1" });
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      projectId: "p1",
      availableCount: 4,
      alreadyConnected: false,
      pendingRequest: false,
      investor: { organizationId: "inv-1", displayName: "Gradnja Plus" },
    });
    expect(items[0]?.priceMin).toBe("120000.00");
  });
});
