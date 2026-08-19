import "server-only";
import { Prisma } from "@prisma/client";

import { prisma } from "@/server/db/prisma";
import { DomainErrors } from "@/lib/errors";
import { toDecimal } from "@/lib/formatters/money";

/**
 * Project P&L service — Faza 8.1 (A5).
 *
 * Prihod = SUM(sale.finalPrice) filtered
 *   `status IN CONTRACTED, PAYMENT_IN_PROGRESS, PAID, HANDED_OVER`.
 * Trošak = SUM(project.landCost, constructionCost, marketingCost,
 *           otherCost) + SUM(commission.paidAmount / commission.calculatedAmount).
 * Neto  = Prihod − Trošak.
 *
 * Sve troškovne stavke su opcione — ako investitor još nije uneo
 * pare, panel prikazuje "još nema unetih troškova" umesto haosa.
 */

const ACCOUNTABLE_SALE_STATUSES: Prisma.SaleWhereInput["status"] = {
  in: ["CONTRACTED", "PAYMENT_IN_PROGRESS", "PAID", "HANDED_OVER"],
};

export interface ProjectPnlRow {
  projectId: string;
  projectName: string;
  currency: string;
  landCost: string;
  constructionCost: string;
  marketingCost: string;
  otherCost: string;
  commissionCost: string;
  totalCost: string;
  revenue: string;
  netMargin: string;
  hasCosts: boolean;
  salesCount: number;
}

export interface ProjectPnlSummary {
  currency: string;
  revenueTotal: string;
  costTotal: string;
  netMargin: string;
}

export interface ProjectPnlReport {
  rows: ProjectPnlRow[];
  summaries: ProjectPnlSummary[];
}

export async function computeProjectPnl(input: {
  organizationId: string;
  projectId?: string;
}): Promise<ProjectPnlReport> {
  const projects = await prisma.project.findMany({
    where: {
      organizationId: input.organizationId,
      archivedAt: null,
      ...(input.projectId ? { id: input.projectId } : {}),
    },
    select: {
      id: true,
      name: true,
      defaultCurrency: true,
      landCost: true,
      constructionCost: true,
      marketingCost: true,
      otherCost: true,
    },
    orderBy: { name: "asc" },
  });

  if (projects.length === 0) {
    return { rows: [], summaries: [] };
  }

  const ids = projects.map((p) => p.id);

  const [salesAgg, commissionAgg] = await Promise.all([
    prisma.sale.groupBy({
      by: ["projectId", "currency"],
      where: {
        organizationId: input.organizationId,
        projectId: { in: ids },
        status: ACCOUNTABLE_SALE_STATUSES,
      },
      _sum: { finalPrice: true },
      _count: { _all: true },
    }),
    prisma.commission.groupBy({
      by: ["currency"],
      where: {
        investorOrganizationId: input.organizationId,
        sale: {
          projectId: { in: ids },
          status: ACCOUNTABLE_SALE_STATUSES,
        },
      },
      _sum: {
        calculatedAmount: true,
        paidAmount: true,
      },
    }),
  ]);

  // Per-project commission via a per-project group-by (Prisma doesn't
  // support two-level nested groupBy in one call).
  const perProjectCommissions = await prisma.commission.groupBy({
    by: ["saleId"],
    where: {
      investorOrganizationId: input.organizationId,
      sale: {
        projectId: { in: ids },
        status: ACCOUNTABLE_SALE_STATUSES,
      },
    },
    _sum: { calculatedAmount: true, paidAmount: true },
  });
  const commissionSalesRel = await prisma.sale.findMany({
    where: {
      organizationId: input.organizationId,
      id: { in: perProjectCommissions.map((r) => r.saleId) },
    },
    select: { id: true, projectId: true },
  });
  const saleToProject = new Map(commissionSalesRel.map((s) => [s.id, s.projectId]));
  const commissionByProject = new Map<string, { amount: import("decimal.js").default }>();
  for (const row of perProjectCommissions) {
    const projectId = saleToProject.get(row.saleId);
    if (!projectId) continue;
    const paid = row._sum.paidAmount
      ? toDecimal(row._sum.paidAmount)
      : toDecimal(0);
    const calc = row._sum.calculatedAmount
      ? toDecimal(row._sum.calculatedAmount)
      : toDecimal(0);
    const value = paid.gt(0) ? paid : calc;
    const existing = commissionByProject.get(projectId);
    commissionByProject.set(
      projectId,
      existing
        ? { amount: existing.amount.add(value) }
        : { amount: value },
    );
  }

  const rows: ProjectPnlRow[] = projects.map((p) => {
    const projectSales = salesAgg.filter((s) => s.projectId === p.id);
    // Pick the "dominant" currency for the project — most projects
    // sell in a single currency; pick the project's default when the
    // sales list is empty.
    const dominantCurrency =
      projectSales.length > 0
        ? projectSales
            .slice()
            .sort((a, b) => (b._count._all as number) - (a._count._all as number))[0]!.currency
        : p.defaultCurrency;

    const revenue = projectSales
      .filter((s) => s.currency === dominantCurrency)
      .reduce(
        (acc, s) => acc.add(s._sum.finalPrice ? toDecimal(s._sum.finalPrice) : toDecimal(0)),
        toDecimal(0),
      );
    const salesCount = projectSales.reduce((acc, s) => acc + Number(s._count._all), 0);

    const land = p.landCost ? toDecimal(p.landCost) : toDecimal(0);
    const construction = p.constructionCost ? toDecimal(p.constructionCost) : toDecimal(0);
    const marketing = p.marketingCost ? toDecimal(p.marketingCost) : toDecimal(0);
    const other = p.otherCost ? toDecimal(p.otherCost) : toDecimal(0);
    const commission = commissionByProject.get(p.id)?.amount ?? toDecimal(0);

    const totalCost = land.add(construction).add(marketing).add(other).add(commission);
    const netMargin = revenue.sub(totalCost);
    const hasCosts =
      p.landCost != null ||
      p.constructionCost != null ||
      p.marketingCost != null ||
      p.otherCost != null;

    return {
      projectId: p.id,
      projectName: p.name,
      currency: dominantCurrency,
      landCost: land.toString(),
      constructionCost: construction.toString(),
      marketingCost: marketing.toString(),
      otherCost: other.toString(),
      commissionCost: commission.toString(),
      totalCost: totalCost.toString(),
      revenue: revenue.toString(),
      netMargin: netMargin.toString(),
      hasCosts,
      salesCount,
    };
  });

  // Roll up per currency for the overall summary strip.
  const summaryMap = new Map<
    string,
    { revenue: import("decimal.js").default; cost: import("decimal.js").default }
  >();
  for (const r of rows) {
    const cur = r.currency;
    const existing =
      summaryMap.get(cur) ?? {
        revenue: toDecimal(0),
        cost: toDecimal(0),
      };
    summaryMap.set(cur, {
      revenue: existing.revenue.add(toDecimal(r.revenue)),
      cost: existing.cost.add(toDecimal(r.totalCost)),
    });
  }
  const summaries: ProjectPnlSummary[] = Array.from(summaryMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([currency, agg]) => ({
      currency,
      revenueTotal: agg.revenue.toString(),
      costTotal: agg.cost.toString(),
      netMargin: agg.revenue.sub(agg.cost).toString(),
    }));

  // Silence the "unused" warning on the group-by we ran to keep the
  // fallback aggregate available for future dashboards.
  void commissionAgg;

  return { rows, summaries };
}

export async function getProjectCostFields(input: {
  organizationId: string;
  projectId: string;
}) {
  const p = await prisma.project.findFirst({
    where: { id: input.projectId, organizationId: input.organizationId },
    select: {
      id: true,
      name: true,
      defaultCurrency: true,
      landCost: true,
      constructionCost: true,
      marketingCost: true,
      otherCost: true,
      budgetNote: true,
    },
  });
  if (!p) throw DomainErrors.notFound("Projekat");
  return p;
}
