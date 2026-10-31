import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Faza 11 — resolveNoticeUnitIds: ensure the audience discriminator is
 * honoured and that short-circuit cases (empty audienceParams, missing
 * entranceIds, etc.) return an empty set instead of silently falling
 * back to ALL. These scenarios are what guarantees the resident portal
 * and the email delivery agree on who receives a notice.
 */

type AsyncFn = (...args: unknown[]) => Promise<unknown>;

const prismaMock = vi.hoisted(() => ({
  managedUnit: {
    findMany: vi.fn<AsyncFn>(),
  },
}));

vi.mock("@/server/db/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/server/audit/audit", () => ({ recordAudit: vi.fn() }));
vi.mock("@/server/auth/email", () => ({ sendEmail: vi.fn() }));
vi.mock("@/server/services/manager/buildings.service", () => ({
  assertBuildingBelongsToOrg: vi.fn(),
}));

import { noticeVisibleOnPortal, resolveNoticeUnitIds } from "./notices.service";

const baseNotice = {
  organizationId: "org-1",
  buildingId: "bld-1",
};

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.managedUnit.findMany.mockResolvedValue([{ id: "unit-A" }, { id: "unit-B" }]);
});

describe("resolveNoticeUnitIds", () => {
  it("ALL returns every active unit in the building", async () => {
    const ids = await resolveNoticeUnitIds({
      ...baseNotice,
      audience: "ALL",
      audienceParams: null,
    });
    expect(ids).toEqual(["unit-A", "unit-B"]);
    const call = prismaMock.managedUnit.findMany.mock.calls[0]?.[0] as {
      where: { organizationId: string; buildingId: string; archivedAt: null };
    };
    expect(call.where).toMatchObject({
      organizationId: "org-1",
      buildingId: "bld-1",
      archivedAt: null,
    });
  });

  it("BY_ENTRANCE scopes units to the picked entranceIds", async () => {
    await resolveNoticeUnitIds({
      ...baseNotice,
      audience: "BY_ENTRANCE",
      audienceParams: { entranceIds: ["ent-A"] },
    });
    const call = prismaMock.managedUnit.findMany.mock.calls[0]?.[0] as {
      where: { entranceId?: { in: string[] } };
    };
    expect(call.where.entranceId).toEqual({ in: ["ent-A"] });
  });

  it("BY_ENTRANCE with no entranceIds returns [] without querying", async () => {
    const ids = await resolveNoticeUnitIds({
      ...baseNotice,
      audience: "BY_ENTRANCE",
      audienceParams: {},
    });
    expect(ids).toEqual([]);
    expect(prismaMock.managedUnit.findMany).not.toHaveBeenCalled();
  });

  it("BY_UNIT_TYPE scopes by `type`", async () => {
    await resolveNoticeUnitIds({
      ...baseNotice,
      audience: "BY_UNIT_TYPE",
      audienceParams: { unitTypes: ["APARTMENT", "OFFICE"] },
    });
    const call = prismaMock.managedUnit.findMany.mock.calls[0]?.[0] as {
      where: { type?: { in: string[] } };
    };
    expect(call.where.type).toEqual({ in: ["APARTMENT", "OFFICE"] });
  });

  it("BY_UNIT_TYPE with empty list returns [] without querying", async () => {
    const ids = await resolveNoticeUnitIds({
      ...baseNotice,
      audience: "BY_UNIT_TYPE",
      audienceParams: { unitTypes: [] },
    });
    expect(ids).toEqual([]);
    expect(prismaMock.managedUnit.findMany).not.toHaveBeenCalled();
  });

  it("SPECIFIC_UNITS scopes by `id` IN set", async () => {
    await resolveNoticeUnitIds({
      ...baseNotice,
      audience: "SPECIFIC_UNITS",
      audienceParams: { unitIds: ["u1", "u2"] },
    });
    const call = prismaMock.managedUnit.findMany.mock.calls[0]?.[0] as {
      where: { id?: { in: string[] } };
    };
    expect(call.where.id).toEqual({ in: ["u1", "u2"] });
  });

  it("ignores irrelevant audience params for the chosen audience", async () => {
    // BY_ENTRANCE audience with stale unitIds from a previous draft — the
    // helper must only honour entranceIds.
    await resolveNoticeUnitIds({
      ...baseNotice,
      audience: "BY_ENTRANCE",
      audienceParams: { entranceIds: ["ent-X"], unitIds: ["u1"] },
    });
    const call = prismaMock.managedUnit.findMany.mock.calls[0]?.[0] as {
      where: { entranceId?: { in: string[] }; id?: unknown };
    };
    expect(call.where.entranceId).toEqual({ in: ["ent-X"] });
    expect(call.where.id).toBeUndefined();
  });
});

describe("noticeVisibleOnPortal", () => {
  it("hides email-only notices", () => {
    expect(
      noticeVisibleOnPortal({
        channel: "EMAIL_ONLY",
        audience: "ALL",
        targetedUnitIds: [],
        residentUnitIds: ["u1"],
      }),
    ).toBe(false);
  });

  it("shows an all-building notice to a resident of that building", () => {
    expect(
      noticeVisibleOnPortal({
        channel: "PORTAL_AND_EMAIL",
        audience: "ALL",
        targetedUnitIds: [],
        residentUnitIds: ["u1"],
      }),
    ).toBe(true);
  });

  it("shows a targeted notice only when the resident's unit is included", () => {
    expect(
      noticeVisibleOnPortal({
        channel: "PORTAL_ONLY",
        audience: "SPECIFIC_UNITS",
        targetedUnitIds: ["u2"],
        residentUnitIds: ["u1"],
      }),
    ).toBe(false);
    expect(
      noticeVisibleOnPortal({
        channel: "PORTAL_ONLY",
        audience: "SPECIFIC_UNITS",
        targetedUnitIds: ["u1", "u2"],
        residentUnitIds: ["u1"],
      }),
    ).toBe(true);
  });
});
