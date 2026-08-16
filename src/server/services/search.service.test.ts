import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/server/db/prisma", () => ({ prisma: {} }));
vi.mock("@/server/audit/audit", () => ({ recordAudit: vi.fn() }));
vi.mock("@/server/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock("@/server/permissions/property-desk", () => ({
  requirePropertyDeskAccess: vi.fn(),
}));
vi.mock("@/server/services/projects.service", () => ({
  listProjects: vi.fn(),
}));
vi.mock("@/server/services/units.service", () => ({
  listUnits: vi.fn(),
}));
vi.mock("@/server/services/buyers.service", () => ({
  listBuyers: vi.fn(),
}));
vi.mock("@/server/services/platform.service", () => ({
  listAllOrganizations: vi.fn(),
  listAllUsers: vi.fn(),
}));
vi.mock("@/server/services/property-desk/marketing-leads.service", () => ({
  listMarketingLeads: vi.fn(),
}));

import { requirePropertyDeskAccess } from "@/server/permissions/property-desk";
import { listBuyers } from "@/server/services/buyers.service";
import {
  listAllOrganizations,
  listAllUsers,
} from "@/server/services/platform.service";
import { listProjects } from "@/server/services/projects.service";
import { listMarketingLeads } from "@/server/services/property-desk/marketing-leads.service";
import { listUnits } from "@/server/services/units.service";
import {
  canSearchLeads,
  canSearchPlatform,
  canSearchTenant,
  runGlobalSearch,
  type SearchCaller,
} from "./search.service";

const listProjectsMock = vi.mocked(listProjects);
const listUnitsMock = vi.mocked(listUnits);
const listBuyersMock = vi.mocked(listBuyers);
const listOrgsMock = vi.mocked(listAllOrganizations);
const listUsersMock = vi.mocked(listAllUsers);
const listLeadsMock = vi.mocked(listMarketingLeads);
const pdAccessMock = vi.mocked(requirePropertyDeskAccess);

function caller(overrides: Partial<SearchCaller> = {}): SearchCaller {
  return {
    isSuperAdmin: false,
    permissions: [],
    activeOrganization: null,
    propertyDeskTeam: null,
    ...overrides,
  };
}

describe("search scopes", () => {
  it("skips tenant search when there is no active organization", () => {
    expect(canSearchTenant(caller())).toBe(false);
    expect(
      canSearchTenant(caller({ activeOrganization: { id: "org-1" } })),
    ).toBe(true);
  });

  it("limits platform catalog search to SUPER_ADMIN", () => {
    expect(canSearchPlatform(caller())).toBe(false);
    expect(canSearchPlatform(caller({ isSuperAdmin: true }))).toBe(true);
  });

  it("allows lead search for SUPER_ADMIN and enabled PD team members", () => {
    expect(canSearchLeads(caller())).toBe(false);
    expect(canSearchLeads(caller({ isSuperAdmin: true }))).toBe(true);
    expect(
      canSearchLeads(caller({ propertyDeskTeam: { enabled: true } })),
    ).toBe(true);
  });
});

describe("runGlobalSearch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listProjectsMock.mockResolvedValue({ items: [], total: 0 });
    listUnitsMock.mockResolvedValue({ items: [], total: 0 });
    listBuyersMock.mockResolvedValue({ items: [], total: 0 });
    listOrgsMock.mockResolvedValue({ items: [], total: 0 });
    listUsersMock.mockResolvedValue({ items: [], total: 0 });
    listLeadsMock.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 5,
    });
    pdAccessMock.mockResolvedValue({
      isSuperAdmin: true,
      teamMember: null,
      session: {} as never,
    });
  });

  it("returns an empty list for a logged-in user without an org (no 401)", async () => {
    const hits = await runGlobalSearch({
      caller: caller(),
      q: "zemu",
    });
    expect(hits).toEqual([]);
    expect(listProjectsMock).not.toHaveBeenCalled();
    expect(listOrgsMock).not.toHaveBeenCalled();
  });

  it("searches tenant inventory when the org and permissions are present", async () => {
    listProjectsMock.mockResolvedValue({
      items: [
        {
          id: "p1",
          name: "Zemun Park",
          code: "ZP",
          city: "Zemun",
        } as never,
      ],
      total: 1,
    });

    const hits = await runGlobalSearch({
      caller: caller({
        activeOrganization: { id: "org-1" },
        permissions: ["project.read"],
      }),
      q: "zemu",
    });

    expect(listProjectsMock).toHaveBeenCalledWith(
      expect.objectContaining({ organizationId: "org-1", search: "zemu" }),
    );
    expect(hits).toEqual([
      expect.objectContaining({
        entity: "project",
        title: "Zemun Park",
        href: "/projekti/p1",
      }),
    ]);
  });

  it("searches organizations, users and leads for SUPER_ADMIN without an org", async () => {
    listOrgsMock.mockResolvedValue({
      items: [
        {
          id: "org-z",
          name: "Zemun Invest",
          slug: "zemun-invest",
          type: "INVESTOR",
        } as never,
      ],
      total: 1,
    });
    listLeadsMock.mockResolvedValue({
      items: [
        {
          id: "lead-1",
          firstName: "Ana",
          lastName: "Zemunac",
          email: "ana@example.com",
          city: "Zemun",
          companyName: null,
        } as never,
      ],
      total: 1,
      page: 1,
      pageSize: 5,
    });

    const hits = await runGlobalSearch({
      caller: caller({ isSuperAdmin: true }),
      q: "zemu",
    });

    expect(listProjectsMock).not.toHaveBeenCalled();
    expect(listOrgsMock).toHaveBeenCalled();
    expect(listUsersMock).toHaveBeenCalled();
    expect(listLeadsMock).toHaveBeenCalled();
    expect(hits.map((h) => h.entity).sort()).toEqual(["lead", "organization"]);
  });
});
