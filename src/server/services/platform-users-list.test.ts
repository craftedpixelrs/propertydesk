import { describe, expect, it, vi } from "vitest";

vi.mock("@/server/db/prisma", () => ({ prisma: {} }));
vi.mock("@/server/audit/audit", () => ({ recordAudit: vi.fn() }));
vi.mock("@/server/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock("@/server/services/property-desk/team.service", () => ({
  addTeamMember: vi.fn(),
  removeTeamMember: vi.fn(),
  updateTeamMember: vi.fn(),
}));

import { buildPlatformUserListWhere } from "./platform.service";

describe("buildPlatformUserListWhere", () => {
  it("returns an empty where when no filters are set", () => {
    expect(buildPlatformUserListWhere({})).toEqual({});
  });

  it("filters by organization, org type and application role together", () => {
    const where = buildPlatformUserListWhere({
      organizationId: "org-1",
      orgType: "INVESTOR",
      role: "FINANCE",
    });
    expect(where.memberships).toEqual({
      some: {
        organizationId: "org-1",
        role: "FINANCE",
        organization: { profile: { type: "INVESTOR" } },
      },
    });
  });

  it("filters accounts with no organization", () => {
    expect(buildPlatformUserListWhere({ organizationId: "none" })).toEqual({
      memberships: { none: {} },
    });
  });

  it("filters Property Desk team membership and role", () => {
    expect(buildPlatformUserListWhere({ propertyDeskTeam: true })).toEqual({
      propertyDeskTeam: { isNot: null },
    });
    expect(buildPlatformUserListWhere({ propertyDeskTeam: "none" })).toEqual({
      propertyDeskTeam: { is: null },
    });
    expect(buildPlatformUserListWhere({ propertyDeskTeam: "CLOSER" })).toEqual({
      propertyDeskTeam: { is: { teamRole: "CLOSER" } },
    });
  });

  it("filters account status and platform layer", () => {
    expect(buildPlatformUserListWhere({ status: "verified" })).toEqual({
      emailVerified: true,
      banned: { not: true },
    });
    expect(buildPlatformUserListWhere({ platform: "SUPER_ADMIN" })).toEqual({
      role: "SUPER_ADMIN",
    });
  });
});
