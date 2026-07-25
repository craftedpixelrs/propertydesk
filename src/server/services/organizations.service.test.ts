import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the Prisma client with just the shape we need. Declared via
// `vi.hoisted` because vitest hoists `vi.mock` calls to the top of the
// file, before regular module-level declarations.
const prismaMock = vi.hoisted(() => ({
  organization: {
    count: vi.fn(),
    findMany: vi.fn(),
  },
}));

vi.mock("@/server/db/prisma", () => ({ prisma: prismaMock }));

import { listOrganizationsForUser } from "./organizations.service";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("listOrganizationsForUser (cross-tenant scoping)", () => {
  it("regular users query only orgs they are a member of", async () => {
    prismaMock.organization.count.mockResolvedValue(0);
    prismaMock.organization.findMany.mockResolvedValue([]);

    await listOrganizationsForUser({
      userId: "user-a",
      isSuperAdmin: false,
      page: 1,
      pageSize: 10,
    });

    const [countArgs] = prismaMock.organization.count.mock.calls[0] ?? [];
    expect(countArgs).toBeDefined();
    // The service must include the membership filter — otherwise a user
    // could list ALL organizations in the system.
    expect(JSON.stringify(countArgs.where)).toContain('"members"');
    expect(JSON.stringify(countArgs.where)).toContain('"userId":"user-a"');
  });

  it("SUPER_ADMIN can see all organizations", async () => {
    prismaMock.organization.count.mockResolvedValue(0);
    prismaMock.organization.findMany.mockResolvedValue([]);

    await listOrganizationsForUser({
      userId: "admin-1",
      isSuperAdmin: true,
      page: 1,
      pageSize: 10,
    });

    const [countArgs] = prismaMock.organization.count.mock.calls[0] ?? [];
    // SUPER_ADMIN is allowed unfiltered visibility. Verify explicitly.
    expect(JSON.stringify(countArgs.where ?? {})).not.toContain('"members"');
  });

  it("regular user's search still stays inside their membership scope", async () => {
    prismaMock.organization.count.mockResolvedValue(0);
    prismaMock.organization.findMany.mockResolvedValue([]);

    await listOrganizationsForUser({
      userId: "user-b",
      isSuperAdmin: false,
      page: 1,
      pageSize: 10,
      search: "Beograd",
    });

    const [findArgs] = prismaMock.organization.findMany.mock.calls[0] ?? [];
    const where = JSON.stringify(findArgs.where);
    expect(where).toContain('"members"');
    expect(where).toContain('"userId":"user-b"');
    expect(where).toContain("Beograd");
  });
});
