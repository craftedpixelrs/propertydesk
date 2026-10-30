import "server-only";
import type {
  BuildingExpenseFund,
  MaintenanceCategory,
  MaintenanceStatus,
  Prisma,
} from "@prisma/client";
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

// ---------------------------------------------------------------------------
// Maintenance program report — program održavanja
// ---------------------------------------------------------------------------

export interface MaintenanceProgramRow {
  buildingId: string;
  buildingName: string;
  category: MaintenanceCategory;
  totalCount: number;
  openCount: number;
  inProgressCount: number;
  awaitingPartsCount: number;
  completedCount: number;
  canceledCount: number;
  estimatedCost: string;
  actualCost: string;
}

export interface MaintenanceProgramTotals {
  totalCount: number;
  completedCount: number;
  openCount: number;
  estimatedCost: string;
  actualCost: string;
}

/**
 * Faza 11 — "program održavanja" report. Groups every maintenance ticket
 * in the chosen period by building and category, counting statuses and
 * summing estimated/actual costs. Used by managers to review workload,
 * plan next-year budgets and justify fund usage to the assembly.
 */
export async function buildMaintenanceProgramReport(input: {
  organizationId: string;
  from: Date;
  to: Date;
  buildingId?: string | null;
}): Promise<{
  rows: MaintenanceProgramRow[];
  totals: MaintenanceProgramTotals;
  byCategory: Array<{ category: MaintenanceCategory; count: number; actualCost: string }>;
}> {
  const where: Prisma.MaintenanceTicketWhereInput = {
    organizationId: input.organizationId,
    createdAt: { gte: input.from, lt: input.to },
    ...(input.buildingId ? { buildingId: input.buildingId } : {}),
  };

  const tickets = await prisma.maintenanceTicket.findMany({
    where,
    select: {
      buildingId: true,
      category: true,
      status: true,
      estimatedCost: true,
      actualCost: true,
      building: { select: { id: true, name: true } },
    },
  });

  const byKey = new Map<string, MaintenanceProgramRow>();
  let totalCount = 0;
  let completedCount = 0;
  let openCount = 0;
  let totalEst = new Decimal(0);
  let totalAct = new Decimal(0);
  const categoryTotals = new Map<MaintenanceCategory, { count: number; actual: Decimal }>();

  for (const t of tickets) {
    const key = `${t.buildingId}::${t.category}`;
    let row = byKey.get(key);
    if (!row) {
      row = {
        buildingId: t.buildingId,
        buildingName: t.building?.name ?? "—",
        category: t.category,
        totalCount: 0,
        openCount: 0,
        inProgressCount: 0,
        awaitingPartsCount: 0,
        completedCount: 0,
        canceledCount: 0,
        estimatedCost: "0.00",
        actualCost: "0.00",
      };
      byKey.set(key, row);
    }
    row.totalCount += 1;
    totalCount += 1;
    switch (t.status as MaintenanceStatus) {
      case "OPEN":
      case "TRIAGED":
        row.openCount += 1;
        openCount += 1;
        break;
      case "IN_PROGRESS":
        row.inProgressCount += 1;
        openCount += 1;
        break;
      case "AWAITING_PARTS":
        row.awaitingPartsCount += 1;
        openCount += 1;
        break;
      case "COMPLETED":
        row.completedCount += 1;
        completedCount += 1;
        break;
      case "CANCELED":
        row.canceledCount += 1;
        break;
    }
    const est = t.estimatedCost ? new Decimal(t.estimatedCost.toString()) : new Decimal(0);
    const act = t.actualCost ? new Decimal(t.actualCost.toString()) : new Decimal(0);
    row.estimatedCost = new Decimal(row.estimatedCost).plus(est).toFixed(2);
    row.actualCost = new Decimal(row.actualCost).plus(act).toFixed(2);
    totalEst = totalEst.plus(est);
    totalAct = totalAct.plus(act);

    const cat = categoryTotals.get(t.category) ?? { count: 0, actual: new Decimal(0) };
    cat.count += 1;
    cat.actual = cat.actual.plus(act);
    categoryTotals.set(t.category, cat);
  }

  const rows = Array.from(byKey.values()).sort(
    (a, b) => a.buildingName.localeCompare(b.buildingName) || a.category.localeCompare(b.category),
  );

  const byCategory = Array.from(categoryTotals.entries())
    .map(([category, v]) => ({
      category,
      count: v.count,
      actualCost: v.actual.toFixed(2),
    }))
    .sort((a, b) => b.count - a.count);

  return {
    rows,
    totals: {
      totalCount,
      completedCount,
      openCount,
      estimatedCost: totalEst.toFixed(2),
      actualCost: totalAct.toFixed(2),
    },
    byCategory,
  };
}
