import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  project: { findMany: vi.fn() },
  sale: { groupBy: vi.fn(), findMany: vi.fn() },
  commission: { groupBy: vi.fn() },
}));

vi.mock("@/server/db/prisma", () => ({ prisma: prismaMock }));

import { computeProjectPnl } from "./pnl.service";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("computeProjectPnl", () => {
  it("scopes commissions by investorOrganizationId, not organizationId", async () => {
    prismaMock.project.findMany.mockResolvedValue([
      {
        id: "p1",
        name: "Park",
        defaultCurrency: "EUR",
        landCost: null,
        constructionCost: null,
        marketingCost: null,
        otherCost: null,
      },
    ]);
    prismaMock.sale.groupBy.mockResolvedValue([]);
    prismaMock.sale.findMany.mockResolvedValue([]);
    prismaMock.commission.groupBy.mockResolvedValue([]);

    await computeProjectPnl({ organizationId: "org-1" });

    expect(prismaMock.commission.groupBy).toHaveBeenCalled();
    for (const call of prismaMock.commission.groupBy.mock.calls) {
      const arg = call[0] as {
        where: Record<string, unknown>;
        _sum: Record<string, unknown>;
      };
      expect(arg.where.organizationId).toBeUndefined();
      expect(arg.where.investorOrganizationId).toBe("org-1");
      expect(arg._sum.paidAmount).toBeUndefined();
      expect(arg._sum.calculatedAmount).toBe(true);
    }
  });
});
