import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Cross-tenant access tests for the offer service.
 *
 * An agency without an ACTIVE `AgencyProjectAccess` on a project must not
 * see anything about that project — the API returns 404/empty regardless of
 * how the request is shaped.
 */

const prismaMock = vi.hoisted(() => ({
  agencyProjectAccess: { findMany: vi.fn(), findFirst: vi.fn() },
  project: { findFirst: vi.fn() },
  agencyUnitAccessOverride: { findMany: vi.fn(), findUnique: vi.fn() },
  unit: { count: vi.fn(), findMany: vi.fn(), findFirst: vi.fn() },
  document: { findMany: vi.fn() },
}));

vi.mock("@/server/db/prisma", () => ({ prisma: prismaMock }));

import {
  getOfferProject,
  getOfferUnit,
  listOfferProjects,
  listOfferUnits,
} from "./offer.service";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("offer.service — cross-tenant access", () => {
  it("returns no projects when the agency has no ACTIVE access", async () => {
    prismaMock.agencyProjectAccess.findMany.mockResolvedValueOnce([]);
    const projects = await listOfferProjects({ agencyOrganizationId: "agency-1" });
    expect(projects).toEqual([]);
  });

  it("returns null from getOfferProject when access is missing", async () => {
    prismaMock.agencyProjectAccess.findFirst.mockResolvedValueOnce(null);
    const result = await getOfferProject({
      agencyOrganizationId: "agency-1",
      projectId: "proj-1",
    });
    expect(result).toBeNull();
  });

  it("returns null when the access window has ended", async () => {
    const past = new Date();
    past.setDate(past.getDate() - 30);
    prismaMock.agencyProjectAccess.findFirst.mockResolvedValueOnce({
      id: "a-1",
      agencyConnectionId: "c-1",
      canViewPrices: true,
      canViewFloorPlans: true,
      canRequestReservations: true,
      showOnlyAgencyVisibleUnits: true,
      accessStartsAt: null,
      accessEndsAt: past,
      agencyConnection: { investorOrganizationId: "inv-1" },
    });
    const result = await getOfferProject({
      agencyOrganizationId: "agency-1",
      projectId: "proj-1",
    });
    expect(result).toBeNull();
  });

  it("returns null from getOfferUnit when the unit is hidden by override", async () => {
    prismaMock.agencyProjectAccess.findFirst.mockResolvedValueOnce({
      id: "a-1",
      agencyConnectionId: "c-1",
      canViewPrices: true,
      canViewFloorPlans: true,
      canRequestReservations: true,
      showOnlyAgencyVisibleUnits: true,
      accessStartsAt: null,
      accessEndsAt: null,
      agencyConnection: { investorOrganizationId: "inv-1" },
    });
    prismaMock.unit.findFirst.mockResolvedValueOnce({
      id: "u-1",
      isVisibleToAgencies: true,
      project: { id: "proj-1", name: "P", code: "P" },
    });
    prismaMock.agencyUnitAccessOverride.findUnique.mockResolvedValueOnce({
      visible: false,
    });
    await expect(
      getOfferUnit({
        agencyOrganizationId: "agency-1",
        projectId: "proj-1",
        unitId: "u-1",
      }),
    ).resolves.toBeNull();
  });

  it("returns empty units list when access does not exist", async () => {
    prismaMock.agencyProjectAccess.findFirst.mockResolvedValueOnce(null);
    const { items, total } = await listOfferUnits({
      agencyOrganizationId: "agency-1",
      projectId: "proj-1",
      page: 1,
      pageSize: 20,
    });
    expect(items).toEqual([]);
    expect(total).toBe(0);
  });
});
