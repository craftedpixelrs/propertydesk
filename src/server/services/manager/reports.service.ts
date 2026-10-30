import "server-only";
import type { BuildingExpenseFund, Prisma } from "@prisma/client";
import Decimal from "decimal.js";

import { prisma } from "@/server/db/prisma";

/**
 * Faza 11 — manager reports (financial / debtors / expenses / annual).
 *
 * All aggregates run as single queries; no N+1. Numbers are returned as
 * strings with 2 decimals so the client never has to deal with Decimal.
 */

export interface FinancialReportRow {
  buildingId: string;
  buildingName: string;
  chargedTotal: string;
  paidTotal: string;
  outstanding: string;
  chargesCount: number;
}

export interface FinancialReportTotals {
  chargedTotal: string;
  paidTotal: string;
  outstanding: string;
  chargesCount: number;
  currency: "RSD";
}

export async function buildManagerFinancialReport(input: {
  organizationId: string;
  year: number;
  month?: number | null;
  buildingId?: string | null;
}): Promise<{ rows: FinancialReportRow[]; totals: FinancialReportTotals }> {
  const where: Prisma.DuesChargeWhereInput = {
    organizationId: input.organizationId,
    periodYear: input.year,
    ...(input.month ? { periodMonth: input.month } : {}),
    ...(input.buildingId ? { buildingId: input.buildingId } : {}),
  };

  const grouped = await prisma.duesCharge.groupBy({
    by: ["buildingId"],
    where,
    _sum: { totalAmount: true, paidAmount: true },
    _count: { _all: true },
  });

  const buildingIds = grouped.map((g) => g.buildingId);
  const buildings = buildingIds.length
    ? await prisma.managedBuilding.findMany({
        where: { id: { in: buildingIds } },
        select: { id: true, name: true },
      })
    : [];
  const nameById = new Map(buildings.map((b) => [b.id, b.name]));

  let totalCharged = new Decimal(0);
  let totalPaid = new Decimal(0);
  let totalCount = 0;

  const rows: FinancialReportRow[] = grouped.map((g) => {
    const charged = new Decimal(g._sum.totalAmount?.toString() ?? "0");
    const paid = new Decimal(g._sum.paidAmount?.toString() ?? "0");
    const outstanding = charged.minus(paid);
    totalCharged = totalCharged.plus(charged);
    totalPaid = totalPaid.plus(paid);
    totalCount += g._count._all;
    return {
      buildingId: g.buildingId,
      buildingName: nameById.get(g.buildingId) ?? "—",
      chargedTotal: charged.toFixed(2),
      paidTotal: paid.toFixed(2),
      outstanding: outstanding.toFixed(2),
      chargesCount: g._count._all,
    };
  });

  rows.sort((a, b) => a.buildingName.localeCompare(b.buildingName));

  return {
    rows,
    totals: {
      chargedTotal: totalCharged.toFixed(2),
      paidTotal: totalPaid.toFixed(2),
      outstanding: totalCharged.minus(totalPaid).toFixed(2),
      chargesCount: totalCount,
      currency: "RSD",
    },
  };
}

// ---------------------------------------------------------------------------
// Expenses report — totals by fund kind + per-building breakdown
// ---------------------------------------------------------------------------

export interface ExpenseReportRow {
  buildingId: string;
  buildingName: string;
  fund: BuildingExpenseFund;
  total: string;
  count: number;
}

export async function buildManagerExpensesReport(input: {
  organizationId: string;
  from: Date;
  to: Date;
  buildingId?: string | null;
}): Promise<{
  rows: ExpenseReportRow[];
  byFund: Array<{ fund: BuildingExpenseFund; total: string; count: number }>;
}> {
  const where: Prisma.BuildingExpenseWhereInput = {
    organizationId: input.organizationId,
    spentAt: { gte: input.from, lte: input.to },
    ...(input.buildingId ? { buildingId: input.buildingId } : {}),
  };

  const [perBuilding, perFund] = await Promise.all([
    prisma.buildingExpense.groupBy({
      by: ["buildingId", "fund"],
      where,
      _sum: { amount: true },
      _count: { _all: true },
    }),
    prisma.buildingExpense.groupBy({
      by: ["fund"],
      where,
      _sum: { amount: true },
      _count: { _all: true },
    }),
  ]);

  const buildingIds = Array.from(new Set(perBuilding.map((p) => p.buildingId)));
  const buildings = buildingIds.length
    ? await prisma.managedBuilding.findMany({
        where: { id: { in: buildingIds } },
        select: { id: true, name: true },
      })
    : [];
  const nameById = new Map(buildings.map((b) => [b.id, b.name]));

  const rows: ExpenseReportRow[] = perBuilding.map((p) => ({
    buildingId: p.buildingId,
    buildingName: nameById.get(p.buildingId) ?? "—",
    fund: p.fund,
    total: p._sum.amount ? p._sum.amount.toFixed(2) : "0.00",
    count: p._count._all,
  }));
  rows.sort((a, b) => a.buildingName.localeCompare(b.buildingName) || a.fund.localeCompare(b.fund));

  const byFund = perFund.map((p) => ({
    fund: p.fund,
    total: p._sum.amount ? p._sum.amount.toFixed(2) : "0.00",
    count: p._count._all,
  }));

  return { rows, byFund };
}

// ---------------------------------------------------------------------------
// Annual activity report — godišnji izveštaj o radu upravnika
// ---------------------------------------------------------------------------

export interface AnnualActivityReport {
  year: number;
  organizationId: string;
  buildings: Array<{
    id: string;
    name: string;
    address: string;
    units: number;
  }>;
  dues: FinancialReportTotals;
  expensesByFund: Array<{ fund: BuildingExpenseFund; total: string; count: number }>;
  tickets: {
    reported: number;
    completed: number;
    canceled: number;
    stillOpen: number;
  };
  assemblies: {
    scheduled: number;
    completed: number;
    canceled: number;
  };
  notices: {
    publishedCount: number;
    totalDeliveries: number;
  };
}

export async function buildAnnualActivityReport(input: {
  organizationId: string;
  year: number;
}): Promise<AnnualActivityReport> {
  const from = new Date(Date.UTC(input.year, 0, 1));
  const to = new Date(Date.UTC(input.year + 1, 0, 1));

  const [buildings, duesReport, expenses, tickets, assemblies, notices] = await Promise.all([
    prisma.managedBuilding.findMany({
      where: { organizationId: input.organizationId, archivedAt: null },
      select: {
        id: true,
        name: true,
        address: true,
        _count: { select: { units: { where: { archivedAt: null } } } },
      },
      orderBy: { name: "asc" },
    }),
    buildManagerFinancialReport({ organizationId: input.organizationId, year: input.year }),
    buildManagerExpensesReport({ organizationId: input.organizationId, from, to }),
    prisma.maintenanceTicket.groupBy({
      by: ["status"],
      where: { organizationId: input.organizationId, createdAt: { gte: from, lt: to } },
      _count: { _all: true },
    }),
    prisma.assembly.groupBy({
      by: ["status"],
      where: { organizationId: input.organizationId, scheduledAt: { gte: from, lt: to } },
      _count: { _all: true },
    }),
    prisma.buildingNotice.aggregate({
      where: {
        organizationId: input.organizationId,
        publishedAt: { gte: from, lt: to },
      },
      _count: { _all: true },
      _sum: { emailDeliveredCount: true },
    }),
  ]);

  const ticketsBy = Object.fromEntries(tickets.map((t) => [t.status, t._count._all])) as Record<
    string,
    number
  >;
  const assembliesBy = Object.fromEntries(
    assemblies.map((a) => [a.status, a._count._all]),
  ) as Record<string, number>;

  return {
    year: input.year,
    organizationId: input.organizationId,
    buildings: buildings.map((b) => ({
      id: b.id,
      name: b.name,
      address: b.address,
      units: b._count.units,
    })),
    dues: duesReport.totals,
    expensesByFund: expenses.byFund,
    tickets: {
      reported:
        (ticketsBy.OPEN ?? 0) +
        (ticketsBy.TRIAGED ?? 0) +
        (ticketsBy.IN_PROGRESS ?? 0) +
        (ticketsBy.AWAITING_PARTS ?? 0) +
        (ticketsBy.COMPLETED ?? 0) +
        (ticketsBy.CANCELED ?? 0),
      completed: ticketsBy.COMPLETED ?? 0,
      canceled: ticketsBy.CANCELED ?? 0,
      stillOpen:
        (ticketsBy.OPEN ?? 0) +
        (ticketsBy.TRIAGED ?? 0) +
        (ticketsBy.IN_PROGRESS ?? 0) +
        (ticketsBy.AWAITING_PARTS ?? 0),
    },
    assemblies: {
      scheduled: assembliesBy.SCHEDULED ?? 0,
      completed: assembliesBy.COMPLETED ?? 0,
      canceled: assembliesBy.CANCELED ?? 0,
    },
    notices: {
      publishedCount: notices._count._all,
      totalDeliveries: notices._sum.emailDeliveredCount ?? 0,
    },
  };
}
