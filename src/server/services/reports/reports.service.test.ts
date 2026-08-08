import { beforeEach, describe, expect, it, vi } from "vitest";
import Decimal from "decimal.js";

/**
 * Reports service — fixture-driven accuracy checks.
 *
 * Each test stubs `prisma.*.aggregate` / `.groupBy` / `.findMany` with a
 * known fixture and asserts that:
 *   - totals sum correctly across groups (money math via Decimal, never
 *     via `+`).
 *   - outstanding = contracted - paid (never negative in dashboards).
 *   - status buckets and money aggregates match what the SQL returned.
 *
 * These tests never touch the database — they lock in the compute layer
 * so a regression in reduction/rounding is caught without live data.
 */

const prismaMock = vi.hoisted(() => ({
  unit: { groupBy: vi.fn(), findMany: vi.fn() },
  project: { findMany: vi.fn() },
  sale: { findMany: vi.fn(), groupBy: vi.fn(), count: vi.fn() },
  buyer: { count: vi.fn(), groupBy: vi.fn() },
  reservation: { count: vi.fn(), groupBy: vi.fn(), findMany: vi.fn() },
  payment: { count: vi.fn(), aggregate: vi.fn(), groupBy: vi.fn(), findMany: vi.fn() },
  agencyConnection: { findMany: vi.fn() },
  commission: { groupBy: vi.fn() },
  organization: { findMany: vi.fn() },
  $queryRaw: vi.fn(),
}));

vi.mock("@/server/db/prisma", () => ({ prisma: prismaMock }));

import {
  buildInventoryReport,
  buildSalesReport,
  buildBuyerPipelineReport,
  buildReservationsReport,
  buildPaymentsReport,
  buildAgencyReport,
  buildSalesTrend,
  buildConversionFunnel,
} from "./reports.service";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("buildInventoryReport", () => {
  it("aggregates units by (project, status) and sums area + price", async () => {
    prismaMock.unit.groupBy.mockResolvedValue([
      {
        projectId: "p1",
        status: "AVAILABLE",
        currency: "EUR",
        _count: { _all: 3 },
        _sum: { totalArea: new Decimal("150.5"), finalPrice: new Decimal("300000"), basePrice: null },
      },
      {
        projectId: "p1",
        status: "SOLD",
        currency: "EUR",
        _count: { _all: 2 },
        _sum: { totalArea: new Decimal("100"), finalPrice: new Decimal("250000"), basePrice: null },
      },
    ]);
    prismaMock.unit.findMany.mockResolvedValue([]);
    prismaMock.project.findMany.mockResolvedValue([{ id: "p1", name: "Aleksandar" }]);

    const report = await buildInventoryReport({ organizationId: "org-1" });

    expect(report.totals.units).toBe(5);
    expect(report.totals.areaTotal).toBe("250.5");
    expect(report.totals.priceTotal).toBe("550000");
    expect(report.rows).toHaveLength(2);
    expect(report.rows[0]?.projectName).toBe("Aleksandar");
  });
});

describe("buildSalesReport", () => {
  it("computes outstanding = final - paid per row and sums totals", async () => {
    prismaMock.sale.findMany.mockResolvedValue([
      {
        id: "s1",
        createdAt: new Date("2026-01-05"),
        contractDate: new Date("2026-01-10"),
        status: "CONTRACTED",
        finalPrice: new Decimal("100000"),
        currency: "EUR",
        agencyOrganizationId: null,
        unit: { code: "A-101" },
        project: { name: "Aleksandar" },
        buyer: { firstName: "Ivan", lastName: "Petrović" },
        payments: [{ amount: new Decimal("30000") }, { amount: new Decimal("10000") }],
      },
      {
        id: "s2",
        createdAt: new Date("2026-02-01"),
        contractDate: new Date("2026-02-04"),
        status: "PAID",
        finalPrice: new Decimal("80000"),
        currency: "EUR",
        agencyOrganizationId: null,
        unit: { code: "A-102" },
        project: { name: "Aleksandar" },
        buyer: { firstName: "Ana", lastName: "Marković" },
        payments: [{ amount: new Decimal("80000") }],
      },
    ]);
    prismaMock.sale.groupBy.mockResolvedValue([
      { status: "CONTRACTED", _count: { _all: 1 }, _sum: { finalPrice: new Decimal("100000") } },
      { status: "PAID", _count: { _all: 1 }, _sum: { finalPrice: new Decimal("80000") } },
    ]);

    const report = await buildSalesReport({ organizationId: "org-1" });

    expect(report.totals.count).toBe(2);
    expect(report.totals.finalPriceTotal).toBe("180000");
    expect(report.totals.paidTotal).toBe("120000");
    expect(report.totals.outstandingTotal).toBe("60000");
    expect(report.rows[0]?.outstanding).toBe("60000");
    expect(report.rows[1]?.outstanding).toBe("0");
    expect(report.byStatus).toHaveLength(2);
  });

  it("resolves agency name via a single lookup by agencyOrganizationId", async () => {
    prismaMock.sale.findMany.mockResolvedValue([
      {
        id: "s1",
        createdAt: new Date(),
        contractDate: null,
        status: "CONTRACTED",
        finalPrice: new Decimal("50000"),
        currency: "EUR",
        agencyOrganizationId: "ag-1",
        unit: { code: "A-1" },
        project: { name: "Proj" },
        buyer: { firstName: "A", lastName: "B" },
        payments: [],
      },
    ]);
    prismaMock.sale.groupBy.mockResolvedValue([]);
    prismaMock.organization.findMany.mockResolvedValue([{ id: "ag-1", name: "Agencija X" }]);

    const report = await buildSalesReport({ organizationId: "org-1" });
    expect(report.rows[0]?.agencyName).toBe("Agencija X");
  });
});

describe("buildBuyerPipelineReport", () => {
  it("returns status + source breakdowns with total", async () => {
    prismaMock.buyer.count.mockResolvedValue(4);
    prismaMock.buyer.groupBy
      .mockResolvedValueOnce([
        { status: "NEW", _count: { _all: 2 } },
        { status: "QUALIFIED", _count: { _all: 2 } },
      ])
      .mockResolvedValueOnce([
        { source: "referral", _count: { _all: 3 } },
        { source: null, _count: { _all: 1 } },
      ]);

    const report = await buildBuyerPipelineReport({ organizationId: "org-1" });
    expect(report.totals.buyers).toBe(4);
    expect(report.byStatus).toHaveLength(2);
    expect(report.bySource.find((r) => r.source === "—")?.count).toBe(1);
  });
});

describe("buildReservationsReport", () => {
  it("returns count + status + source breakdowns and rows", async () => {
    prismaMock.reservation.count.mockResolvedValue(3);
    prismaMock.reservation.groupBy
      .mockResolvedValueOnce([
        { status: "REQUESTED", _count: { _all: 2 } },
        { status: "APPROVED", _count: { _all: 1 } },
      ])
      .mockResolvedValueOnce([{ sourceType: "INTERNAL", _count: { _all: 3 } }]);
    prismaMock.reservation.findMany.mockResolvedValue([
      {
        id: "r1",
        createdAt: new Date(),
        status: "REQUESTED",
        sourceType: "INTERNAL",
        unit: { code: "A-1" },
        project: { name: "Proj" },
        buyer: { firstName: "F", lastName: "L" },
      },
    ]);

    const report = await buildReservationsReport({ organizationId: "org-1" });
    expect(report.totals.count).toBe(3);
    expect(report.byStatus).toHaveLength(2);
    expect(report.rows[0]?.buyerName).toBe("F L");
  });
});

describe("buildPaymentsReport", () => {
  it("splits active vs reversed and groups by method", async () => {
    prismaMock.payment.count.mockResolvedValue(3);
    prismaMock.payment.aggregate
      .mockResolvedValueOnce({ _sum: { amount: new Decimal("40000") } })
      .mockResolvedValueOnce({ _sum: { amount: new Decimal("5000") } });
    prismaMock.payment.groupBy.mockResolvedValue([
      {
        paymentMethod: "BANK_TRANSFER",
        _count: { _all: 2 },
        _sum: { amount: new Decimal("35000") },
      },
      {
        paymentMethod: "CASH",
        _count: { _all: 1 },
        _sum: { amount: new Decimal("5000") },
      },
    ]);
    prismaMock.payment.findMany.mockResolvedValue([
      {
        id: "p1",
        saleId: "s1",
        paymentDate: new Date(),
        amount: new Decimal("20000"),
        currency: "EUR",
        paymentMethod: "BANK_TRANSFER",
        reversedAt: null,
        sale: { id: "s1", unit: { code: "A-1" } },
      },
    ]);

    const report = await buildPaymentsReport({ organizationId: "org-1" });
    expect(report.totals.count).toBe(3);
    expect(report.totals.activeTotal).toBe("40000");
    expect(report.totals.reversedTotal).toBe("5000");
    expect(report.byMethod).toHaveLength(2);
  });
});

describe("buildSalesTrend", () => {
  it("normalises bigint counts, sums finalPrice, and preserves month order", async () => {
    prismaMock.$queryRaw.mockResolvedValue([
      {
        bucket: new Date("2026-08-01T00:00:00Z"),
        currency: "EUR",
        count: 3n,
        sum: "180000",
      },
      {
        bucket: new Date("2026-09-01T00:00:00Z"),
        currency: "EUR",
        count: 1n,
        sum: "60000",
      },
    ]);

    const report = await buildSalesTrend({ organizationId: "org-1" });

    expect(prismaMock.$queryRaw).toHaveBeenCalledOnce();
    expect(report.currencies).toEqual(["EUR"]);
    expect(report.points).toHaveLength(2);
    expect(report.points[0]).toMatchObject({
      bucketLabel: "2026-08",
      currency: "EUR",
      salesCount: 3,
      salesTotal: "180000",
    });
    expect(report.points[1]?.bucketLabel).toBe("2026-09");
  });

  it("keeps EUR and RSD buckets in separate rows without adding them", async () => {
    prismaMock.$queryRaw.mockResolvedValue([
      {
        bucket: new Date("2026-08-01T00:00:00Z"),
        currency: "EUR",
        count: 2n,
        sum: "150000",
      },
      {
        bucket: new Date("2026-08-01T00:00:00Z"),
        currency: "RSD",
        count: 1n,
        sum: "12000000",
      },
    ]);

    const report = await buildSalesTrend({ organizationId: "org-1" });

    expect(report.points).toHaveLength(2);
    // Same bucketLabel but different currency lines — never merged into
    // a single number.
    expect(new Set(report.points.map((p) => p.currency))).toEqual(new Set(["EUR", "RSD"]));
    expect(report.currencies).toEqual(["EUR", "RSD"]);
  });

  it("returns an empty result set when there is no data", async () => {
    prismaMock.$queryRaw.mockResolvedValue([]);
    const report = await buildSalesTrend({ organizationId: "org-1" });
    expect(report.points).toEqual([]);
    expect(report.currencies).toEqual([]);
  });
});

describe("buildConversionFunnel", () => {
  it("computes ratios against the top of the funnel", async () => {
    prismaMock.reservation.count
      .mockResolvedValueOnce(20) // reservations
      .mockResolvedValueOnce(15) // approved
      .mockResolvedValueOnce(9); // converted
    prismaMock.sale.count.mockResolvedValueOnce(7); // contracted

    const report = await buildConversionFunnel({ organizationId: "org-1" });

    expect(report.steps.map((s) => [s.key, s.count])).toEqual([
      ["reservations", 20],
      ["approved", 15],
      ["converted", 9],
      ["contracted", 7],
    ]);
    expect(report.steps[0]?.ratioFromTop).toBe(1);
    expect(report.steps[1]?.ratioFromTop).toBe(0.75);
    expect(report.steps[3]?.ratioFromTop).toBe(0.35);
    expect(report.overallConversionRate).toBe(0.35);
  });

  it("never divides by zero when no reservations exist", async () => {
    prismaMock.reservation.count
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0);
    prismaMock.sale.count.mockResolvedValueOnce(0);

    const report = await buildConversionFunnel({ organizationId: "org-1" });
    expect(report.overallConversionRate).toBe(0);
    for (const step of report.steps.slice(1)) {
      expect(Number.isFinite(step.ratioFromTop)).toBe(true);
      expect(step.ratioFromTop).toBe(0);
    }
  });
});

describe("buildAgencyReport", () => {
  it("joins sales/reservations/commissions to each connection and aggregates money", async () => {
    prismaMock.agencyConnection.findMany.mockResolvedValue([
      { agencyOrganizationId: "ag-1", agency: { id: "ag-1", name: "Agencija A" } },
      { agencyOrganizationId: "ag-2", agency: { id: "ag-2", name: "Agencija B" } },
    ]);
    prismaMock.sale.groupBy.mockResolvedValue([
      {
        agencyOrganizationId: "ag-1",
        _count: { _all: 2 },
        _sum: { finalPrice: new Decimal("200000") },
      },
    ]);
    prismaMock.reservation.groupBy.mockResolvedValue([
      { agencyOrganizationId: "ag-1", _count: { _all: 5 } },
    ]);
    prismaMock.commission.groupBy.mockResolvedValue([
      {
        agencyOrganizationId: "ag-1",
        status: "CALCULATED",
        _sum: { calculatedAmount: new Decimal("6000"), adjustedAmount: null },
      },
      {
        agencyOrganizationId: "ag-1",
        status: "PAID",
        _sum: { calculatedAmount: new Decimal("2000"), adjustedAmount: null },
      },
    ]);

    const report = await buildAgencyReport({ organizationId: "org-1" });

    expect(report.totals.agencies).toBe(2);
    expect(report.totals.salesCount).toBe(2);
    expect(report.totals.salesTotal).toBe("200000");
    // 6000 (CALCULATED) + 2000 (PAID) — both count toward "calculated" (not-canceled)
    expect(report.totals.commissionCalculated).toBe("8000");
    expect(report.totals.commissionPaid).toBe("2000");
    const agA = report.rows.find((r) => r.agencyOrganizationId === "ag-1");
    expect(agA?.reservations).toBe(5);
    expect(agA?.salesTotal).toBe("200000");
  });
});
