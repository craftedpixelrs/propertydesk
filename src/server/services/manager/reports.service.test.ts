import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  duesCharge: { groupBy: vi.fn() },
  managedBuilding: { findMany: vi.fn() },
}));

vi.mock("@/server/db/prisma", () => ({ prisma: prismaMock }));

import { buildManagerFinancialReport } from "./reports.service";

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.duesCharge.groupBy.mockResolvedValue([]);
  prismaMock.managedBuilding.findMany.mockResolvedValue([]);
});

describe("buildManagerFinancialReport", () => {
  it("does not count a written-off charge as money still owed", async () => {
    await buildManagerFinancialReport({ organizationId: "org-1", year: 2026 });

    expect(prismaMock.duesCharge.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: "org-1",
          periodYear: 2026,
          status: { not: "WRITTEN_OFF" },
        }),
      }),
    );
  });
});
