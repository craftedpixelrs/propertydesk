import "server-only";
import type { Prisma, SaleStatus, UnitStatus, ReservationStatus } from "@prisma/client";
import Decimal from "decimal.js";

import { prisma } from "@/server/db/prisma";
import { toDecimal, sumMoney } from "@/lib/formatters/money";

/**
 * Report service — investor-side operational + financial reports.
 *
 * Every report accepts a `ReportFilters` object with server-side filters,
 * returns totals + rows, and NEVER pulls raw joined objects into the caller.
 * Instead, each report exports its own explicit DTO shape so exports can
 * serialize deterministically.
 *
 * All money is Decimal-safe. Aggregations use `prisma.groupBy` /
 * `prisma.aggregate` — no JS-side reduction on multi-tenant datasets.
 */

export interface ReportFilters {
  organizationId: string;
  projectId?: string;
  from?: Date;
  to?: Date;
}

// -----------------------------------------------------------------------------
// Inventory report
// -----------------------------------------------------------------------------

export interface InventoryReportRow {
  projectId: string;
  projectName: string;
  status: UnitStatus;
  count: number;
  areaTotal: string;
  priceTotal: string;
  currency: string;
}

export interface InventoryReport {
  filters: ReportFilters;
  totals: { units: number; areaTotal: string; priceTotal: string; currency: string };
  rows: InventoryReportRow[];
  detail: Array<{
    id: string;
    projectName: string;
    code: string;
    status: UnitStatus;
    area: string;
    price: string;
    currency: string;
  }>;
}

export async function buildInventoryReport(filters: ReportFilters): Promise<InventoryReport> {
  const where: Prisma.UnitWhereInput = {
    organizationId: filters.organizationId,
    archivedAt: null,
    ...(filters.projectId ? { projectId: filters.projectId } : {}),
  };

  const [rows, detail, projectsRaw] = await Promise.all([
    prisma.unit.groupBy({
      by: ["projectId", "status", "currency"],
      where,
      _count: { _all: true },
      _sum: { totalArea: true, finalPrice: true, basePrice: true },
    }),
    prisma.unit.findMany({
      where,
      orderBy: [{ project: { name: "asc" } }, { code: "asc" }],
      take: 500,
      select: {
        id: true,
        code: true,
        status: true,
        totalArea: true,
        basePrice: true,
        finalPrice: true,
        currency: true,
        project: { select: { name: true } },
      },
    }),
    prisma.project.findMany({
      where: { organizationId: filters.organizationId },
      select: { id: true, name: true },
    }),
  ]);

  const projectNames = new Map(projectsRaw.map((p) => [p.id, p.name] as const));

  const reportRows: InventoryReportRow[] = rows.map((row) => ({
    projectId: row.projectId,
    projectName: projectNames.get(row.projectId) ?? "—",
    status: row.status,
    count: row._count._all,
    areaTotal: toDecimal(row._sum.totalArea ?? 0).toString(),
    priceTotal: toDecimal(row._sum.finalPrice ?? row._sum.basePrice ?? 0).toString(),
    currency: row.currency,
  }));

  const totalUnits = reportRows.reduce((s, r) => s + r.count, 0);
  const totalArea = sumMoney(reportRows.map((r) => r.areaTotal));
  const totalPrice = sumMoney(reportRows.map((r) => r.priceTotal));
  const currency = reportRows[0]?.currency ?? "EUR";

  return {
    filters,
    totals: {
      units: totalUnits,
      areaTotal: totalArea.toString(),
      priceTotal: totalPrice.toString(),
      currency,
    },
    rows: reportRows,
    detail: detail.map((u) => ({
      id: u.id,
      projectName: u.project.name,
      code: u.code,
      status: u.status,
      area: toDecimal(u.totalArea).toString(),
      price: toDecimal(u.finalPrice ?? u.basePrice).toString(),
      currency: u.currency,
    })),
  };
}

// -----------------------------------------------------------------------------
// Sales report
// -----------------------------------------------------------------------------

export interface SalesReportRow {
  id: string;
  createdAt: Date;
  contractDate: Date | null;
  status: SaleStatus;
  unitCode: string;
  projectName: string;
  buyerName: string;
  agencyName: string | null;
  finalPrice: string;
  paid: string;
  outstanding: string;
  currency: string;
}

export interface SalesReport {
  filters: ReportFilters;
  totals: {
    count: number;
    finalPriceTotal: string;
    paidTotal: string;
    outstandingTotal: string;
    currency: string;
  };
  byStatus: Array<{ status: SaleStatus; count: number; finalPriceTotal: string }>;
  rows: SalesReportRow[];
}

export async function buildSalesReport(filters: ReportFilters): Promise<SalesReport> {
  const where: Prisma.SaleWhereInput = {
    organizationId: filters.organizationId,
    ...(filters.projectId ? { projectId: filters.projectId } : {}),
    ...(filters.from || filters.to
      ? {
          createdAt: {
            ...(filters.from ? { gte: filters.from } : {}),
            ...(filters.to ? { lte: filters.to } : {}),
          },
        }
      : {}),
  };

  const [rows, byStatusRaw] = await Promise.all([
    prisma.sale.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 500,
      include: {
        unit: { select: { code: true } },
        project: { select: { name: true } },
        buyer: { select: { firstName: true, lastName: true } },
        payments: {
          where: { reversedAt: null },
          select: { amount: true },
        },
      },
    }),
    prisma.sale.groupBy({
      by: ["status"],
      where,
      _count: { _all: true },
      _sum: { finalPrice: true },
    }),
  ]);

  const agencyIds = Array.from(
    new Set(
      rows
        .map((r) => r.agencyOrganizationId)
        .filter((id): id is string => Boolean(id)),
    ),
  );
  const agencies = agencyIds.length
    ? await prisma.organization.findMany({
        where: { id: { in: agencyIds } },
        select: { id: true, name: true },
      })
    : [];
  const agencyName = new Map(agencies.map((a) => [a.id, a.name] as const));

  const reportRows: SalesReportRow[] = rows.map((row) => {
    const paid = sumMoney(row.payments.map((p) => p.amount));
    const total = toDecimal(row.finalPrice);
    return {
      id: row.id,
      createdAt: row.createdAt,
      contractDate: row.contractDate,
      status: row.status,
      unitCode: row.unit.code,
      projectName: row.project.name,
      buyerName: `${row.buyer.firstName} ${row.buyer.lastName}`,
      agencyName: row.agencyOrganizationId ? agencyName.get(row.agencyOrganizationId) ?? null : null,
      finalPrice: total.toString(),
      paid: paid.toString(),
      outstanding: total.minus(paid).toString(),
      currency: row.currency,
    };
  });

  const finalPriceTotal = sumMoney(reportRows.map((r) => r.finalPrice));
  const paidTotal = sumMoney(reportRows.map((r) => r.paid));
  const outstandingTotal = finalPriceTotal.minus(paidTotal);
  const currency = reportRows[0]?.currency ?? "EUR";

  return {
    filters,
    totals: {
      count: reportRows.length,
      finalPriceTotal: finalPriceTotal.toString(),
      paidTotal: paidTotal.toString(),
      outstandingTotal: outstandingTotal.toString(),
      currency,
    },
    byStatus: byStatusRaw.map((row) => ({
      status: row.status,
      count: row._count._all,
      finalPriceTotal: toDecimal(row._sum.finalPrice ?? 0).toString(),
    })),
    rows: reportRows,
  };
}

// -----------------------------------------------------------------------------
// Buyer pipeline report
// -----------------------------------------------------------------------------

export interface BuyerPipelineReport {
  filters: ReportFilters;
  totals: { buyers: number };
  byStatus: Array<{ status: string; count: number }>;
  bySource: Array<{ source: string; count: number }>;
}

export async function buildBuyerPipelineReport(
  filters: ReportFilters,
): Promise<BuyerPipelineReport> {
  const where: Prisma.BuyerWhereInput = {
    organizationId: filters.organizationId,
    archivedAt: null,
    ...(filters.from || filters.to
      ? {
          createdAt: {
            ...(filters.from ? { gte: filters.from } : {}),
            ...(filters.to ? { lte: filters.to } : {}),
          },
        }
      : {}),
  };

  const [total, byStatus, bySource] = await Promise.all([
    prisma.buyer.count({ where }),
    prisma.buyer.groupBy({
      by: ["status"],
      where,
      _count: { _all: true },
    }),
    prisma.buyer.groupBy({
      by: ["source"],
      where,
      _count: { _all: true },
    }),
  ]);

  return {
    filters,
    totals: { buyers: total },
    byStatus: byStatus.map((row) => ({ status: row.status, count: row._count._all })),
    bySource: bySource.map((row) => ({ source: row.source ?? "—", count: row._count._all })),
  };
}

// -----------------------------------------------------------------------------
// Reservations report
// -----------------------------------------------------------------------------

export interface ReservationsReport {
  filters: ReportFilters;
  totals: { count: number };
  byStatus: Array<{ status: ReservationStatus; count: number }>;
  bySource: Array<{ source: string; count: number }>;
  rows: Array<{
    id: string;
    createdAt: Date;
    status: ReservationStatus;
    unitCode: string;
    projectName: string;
    buyerName: string;
    source: string;
  }>;
}

export async function buildReservationsReport(
  filters: ReportFilters,
): Promise<ReservationsReport> {
  const where: Prisma.ReservationWhereInput = {
    organizationId: filters.organizationId,
    ...(filters.projectId ? { projectId: filters.projectId } : {}),
    ...(filters.from || filters.to
      ? {
          createdAt: {
            ...(filters.from ? { gte: filters.from } : {}),
            ...(filters.to ? { lte: filters.to } : {}),
          },
        }
      : {}),
  };

  const [count, byStatus, bySource, rows] = await Promise.all([
    prisma.reservation.count({ where }),
    prisma.reservation.groupBy({
      by: ["status"],
      where,
      _count: { _all: true },
    }),
    prisma.reservation.groupBy({
      by: ["sourceType"],
      where,
      _count: { _all: true },
    }),
    prisma.reservation.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 500,
      select: {
        id: true,
        createdAt: true,
        status: true,
        sourceType: true,
        unit: { select: { code: true } },
        project: { select: { name: true } },
        buyer: { select: { firstName: true, lastName: true } },
      },
    }),
  ]);

  return {
    filters,
    totals: { count },
    byStatus: byStatus.map((row) => ({ status: row.status, count: row._count._all })),
    bySource: bySource.map((row) => ({ source: row.sourceType, count: row._count._all })),
    rows: rows.map((r) => ({
      id: r.id,
      createdAt: r.createdAt,
      status: r.status,
      unitCode: r.unit?.code ?? "—",
      projectName: r.project?.name ?? "—",
      buyerName: r.buyer ? `${r.buyer.firstName} ${r.buyer.lastName}` : "—",
      source: r.sourceType,
    })),
  };
}

// -----------------------------------------------------------------------------
// Payments report
// -----------------------------------------------------------------------------

export interface PaymentsReport {
  filters: ReportFilters;
  totals: {
    count: number;
    activeTotal: string;
    reversedTotal: string;
    currency: string;
  };
  byMethod: Array<{ method: string; count: number; total: string }>;
  rows: Array<{
    id: string;
    saleId: string;
    unitCode: string;
    paymentDate: Date;
    amount: string;
    currency: string;
    method: string;
    reversed: boolean;
  }>;
}

export async function buildPaymentsReport(filters: ReportFilters): Promise<PaymentsReport> {
  const where: Prisma.PaymentWhereInput = {
    organizationId: filters.organizationId,
    ...(filters.from || filters.to
      ? {
          paymentDate: {
            ...(filters.from ? { gte: filters.from } : {}),
            ...(filters.to ? { lte: filters.to } : {}),
          },
        }
      : {}),
  };

  const [total, activeAgg, reversedAgg, methodGroups, rows] = await Promise.all([
    prisma.payment.count({ where }),
    prisma.payment.aggregate({
      where: { ...where, reversedAt: null },
      _sum: { amount: true },
    }),
    prisma.payment.aggregate({
      where: { ...where, reversedAt: { not: null } },
      _sum: { amount: true },
    }),
    prisma.payment.groupBy({
      by: ["paymentMethod"],
      where: { ...where, reversedAt: null },
      _count: { _all: true },
      _sum: { amount: true },
    }),
    prisma.payment.findMany({
      where,
      orderBy: { paymentDate: "desc" },
      take: 500,
      include: {
        sale: { select: { id: true, unit: { select: { code: true } } } },
      },
    }),
  ]);

  return {
    filters,
    totals: {
      count: total,
      activeTotal: toDecimal(activeAgg._sum.amount ?? 0).toString(),
      reversedTotal: toDecimal(reversedAgg._sum.amount ?? 0).toString(),
      currency: rows[0]?.currency ?? "EUR",
    },
    byMethod: methodGroups.map((row) => ({
      method: row.paymentMethod,
      count: row._count._all,
      total: toDecimal(row._sum.amount ?? 0).toString(),
    })),
    rows: rows.map((p) => ({
      id: p.id,
      saleId: p.saleId,
      unitCode: p.sale?.unit?.code ?? "—",
      paymentDate: p.paymentDate,
      amount: p.amount.toString(),
      currency: p.currency,
      method: p.paymentMethod,
      reversed: Boolean(p.reversedAt),
    })),
  };
}

// -----------------------------------------------------------------------------
// Agency performance report
// -----------------------------------------------------------------------------

export interface AgencyReportRow {
  agencyOrganizationId: string;
  agencyName: string;
  reservations: number;
  salesCount: number;
  salesTotal: string;
  commissionCalculated: string;
  commissionPaid: string;
  currency: string;
}

export interface AgencyReport {
  filters: ReportFilters;
  totals: {
    agencies: number;
    salesCount: number;
    salesTotal: string;
    commissionCalculated: string;
    commissionPaid: string;
    currency: string;
  };
  rows: AgencyReportRow[];
}

export async function buildAgencyReport(filters: ReportFilters): Promise<AgencyReport> {
  const dateWindow =
    filters.from || filters.to
      ? {
          createdAt: {
            ...(filters.from ? { gte: filters.from } : {}),
            ...(filters.to ? { lte: filters.to } : {}),
          },
        }
      : {};

  const [connections, salesGroup, reservationGroup, commissionGroup] = await Promise.all([
    prisma.agencyConnection.findMany({
      where: { investorOrganizationId: filters.organizationId },
      include: { agency: { select: { id: true, name: true } } },
    }),
    prisma.sale.groupBy({
      by: ["agencyOrganizationId"],
      where: {
        organizationId: filters.organizationId,
        agencyOrganizationId: { not: null },
        ...dateWindow,
      },
      _count: { _all: true },
      _sum: { finalPrice: true },
    }),
    prisma.reservation.groupBy({
      by: ["agencyOrganizationId"],
      where: {
        organizationId: filters.organizationId,
        agencyOrganizationId: { not: null },
        ...dateWindow,
      },
      _count: { _all: true },
    }),
    prisma.commission.groupBy({
      by: ["agencyOrganizationId", "status"],
      where: {
        investorOrganizationId: filters.organizationId,
        ...dateWindow,
      },
      _sum: { calculatedAmount: true, adjustedAmount: true },
    }),
  ]);

  const salesByAgency = new Map<string, { count: number; total: Decimal }>();
  for (const row of salesGroup) {
    if (!row.agencyOrganizationId) continue;
    salesByAgency.set(row.agencyOrganizationId, {
      count: row._count._all,
      total: toDecimal(row._sum.finalPrice ?? 0),
    });
  }
  const reservationsByAgency = new Map<string, number>();
  for (const row of reservationGroup) {
    if (!row.agencyOrganizationId) continue;
    reservationsByAgency.set(row.agencyOrganizationId, row._count._all);
  }
  const commissionByAgency = new Map<
    string,
    { calculated: Decimal; paid: Decimal }
  >();
  for (const row of commissionGroup) {
    const agencyId = row.agencyOrganizationId;
    const bucket = commissionByAgency.get(agencyId) ?? {
      calculated: new Decimal(0),
      paid: new Decimal(0),
    };
    const value = toDecimal(row._sum.adjustedAmount ?? row._sum.calculatedAmount ?? 0);
    if (row.status === "PAID") bucket.paid = bucket.paid.plus(value);
    // Everything except CANCELED counts toward calculated.
    if (row.status !== "CANCELED") bucket.calculated = bucket.calculated.plus(value);
    commissionByAgency.set(agencyId, bucket);
  }

  const rows: AgencyReportRow[] = connections.map((c) => {
    const sales = salesByAgency.get(c.agencyOrganizationId) ?? {
      count: 0,
      total: new Decimal(0),
    };
    const commissions = commissionByAgency.get(c.agencyOrganizationId) ?? {
      calculated: new Decimal(0),
      paid: new Decimal(0),
    };
    return {
      agencyOrganizationId: c.agencyOrganizationId,
      agencyName: c.agency.name,
      reservations: reservationsByAgency.get(c.agencyOrganizationId) ?? 0,
      salesCount: sales.count,
      salesTotal: sales.total.toString(),
      commissionCalculated: commissions.calculated.toString(),
      commissionPaid: commissions.paid.toString(),
      currency: "EUR",
    };
  });

  return {
    filters,
    totals: {
      agencies: rows.length,
      salesCount: rows.reduce((s, r) => s + r.salesCount, 0),
      salesTotal: sumMoney(rows.map((r) => r.salesTotal)).toString(),
      commissionCalculated: sumMoney(rows.map((r) => r.commissionCalculated)).toString(),
      commissionPaid: sumMoney(rows.map((r) => r.commissionPaid)).toString(),
      currency: "EUR",
    },
    rows,
  };
}
