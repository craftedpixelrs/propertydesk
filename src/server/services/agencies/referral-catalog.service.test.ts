import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  agencyConnection: { findFirst: vi.fn() },
  agencyProjectAccess: { findFirst: vi.fn() },
}));

vi.mock("@/server/db/prisma", () => ({ prisma: prismaMock }));

import {
  referralUnlocksProject,
  resolveReferralCatalog,
} from "./referral-catalog.service";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("resolveReferralCatalog", () => {
  it("returns null for an unknown or inactive code", async () => {
    prismaMock.agencyConnection.findFirst.mockResolvedValueOnce(null);
    await expect(resolveReferralCatalog("NOPE1234")).resolves.toBeNull();
  });

  it("lists in-window projects for an ACTIVE connection", async () => {
    const past = new Date();
    past.setDate(past.getDate() - 10);
    prismaMock.agencyConnection.findFirst.mockResolvedValueOnce({
      investor: {
        name: "Gradnja Plus",
        profile: { displayName: "Gradnja Plus", logoUrl: null },
      },
      agency: {
        name: "Top Nekretnine",
        profile: { displayName: "Top Nekretnine" },
      },
      projectAccess: [
        {
          accessStartsAt: null,
          accessEndsAt: null,
          project: {
            id: "p1",
            code: "NBG-01",
            name: "Residence Park",
            slug: "residence-park-novi-beograd",
            publicMicrositeSlug: null,
            city: "Beograd",
            description: "Blok 65",
            coverImageUrl: null,
            archivedAt: null,
          },
        },
        {
          accessStartsAt: null,
          accessEndsAt: past,
          project: {
            id: "p2",
            code: "OLD",
            name: "Istekao",
            slug: "old",
            publicMicrositeSlug: null,
            city: "Beograd",
            description: null,
            coverImageUrl: null,
            archivedAt: null,
          },
        },
      ],
    });

    const catalog = await resolveReferralCatalog("PRV2WS4Q");
    expect(catalog).toMatchObject({
      code: "PRV2WS4Q",
      investorName: "Gradnja Plus",
      agencyName: "Top Nekretnine",
    });
    expect(catalog?.projects).toHaveLength(1);
    expect(catalog?.projects[0]?.slug).toBe("residence-park-novi-beograd");
  });
});

describe("referralUnlocksProject", () => {
  it("is false without a code or matching access", async () => {
    await expect(
      referralUnlocksProject({
        referralCode: null,
        projectId: "p1",
        investorOrganizationId: "inv",
      }),
    ).resolves.toBe(false);

    prismaMock.agencyProjectAccess.findFirst.mockResolvedValueOnce(null);
    await expect(
      referralUnlocksProject({
        referralCode: "PRV2WS4Q",
        projectId: "p1",
        investorOrganizationId: "inv",
      }),
    ).resolves.toBe(false);
  });

  it("is true for an ACTIVE in-window grant", async () => {
    prismaMock.agencyProjectAccess.findFirst.mockResolvedValueOnce({
      accessStartsAt: null,
      accessEndsAt: null,
    });
    await expect(
      referralUnlocksProject({
        referralCode: "PRV2WS4Q",
        projectId: "p1",
        investorOrganizationId: "inv",
      }),
    ).resolves.toBe(true);
  });
});
