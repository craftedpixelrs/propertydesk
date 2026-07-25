import "server-only";
import type { UnitStatus, SaleStatus } from "@prisma/client";
import Decimal from "decimal.js";

import { prisma } from "@/server/db/prisma";
import { toDecimal } from "@/lib/formatters/money";

/**
 * Dashboard aggregate service — the single source of aggregate data for the
 * three landing screens (investor / agency / platform admin).
 *
 * The three characteristics we care about:
 *   1. Batched — every dashboard load fires ONE `Promise.all` per role and
 *      never issues per-row lookups from the UI.
 *   2. Indexed — every filter clause here maps to a composite index defined
 *      in the Phase 1 migration.
 *   3. Server-computed — no JS-side reduction over large row sets. Sums use
 *      `prisma.aggregate({ _sum: … })` and counts use `groupBy` / `count`.
 */

// -----------------------------------------------------------------------------
// Investor
// -----------------------------------------------------------------------------

export interface InvestorDashboard {
  totals: {
    projects: number;
    unitsAvailable: number;
    unitsReserved: number;
    unitsContracted: number;
    unitsSold: number;
    unitsTotal: number;
    activeReservations: number;
    activeSales: number;
    buyersActive: number;
    tasksOverdue: number;
    tasksToday: number;
  };
  financial: {
    salesContractedTotal: string;
    salesPaidTotal: string;
    salesOutstandingTotal: string;
    currency: string;
  };
  inventoryByStatus: Array<{ status: UnitStatus; count: number }>;
  salesByStatus: Array<{ status: SaleStatus; count: number }>;
  recentReservations: Array<{
    id: string;
    createdAt: Date;
    unitCode: string;
    buyerName: string;
    status: string;
  }>;
  recentSales: Array<{
    id: string;
    createdAt: Date;
    unitCode: string;
    buyerName: string;
    status: SaleStatus;
    finalPrice: string;
    currency: string;
  }>;
  upcomingInstallments: Array<{
    id: string;
    saleId: string;
    unitCode: string;
    name: string;
    amount: string;
    currency: string;
    dueDate: Date;
  }>;
}

export async function loadInvestorDashboard(
  organizationId: string,
): Promise<InvestorDashboard> {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
  const in14 = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

  const [
    projectsCount,
    inventoryGroup,
    reservationsActive,
    salesByStatus,
    salesFinancialAgg,
    paymentsAgg,
    buyersActive,
    tasksOverdue,
    tasksToday,
    recentReservations,
    recentSales,
    upcomingInstallments,
  ] = await Promise.all([
    prisma.project.count({
      where: { organizationId, archivedAt: null },
    }),
    prisma.unit.groupBy({
      by: ["status"],
      where: { organizationId, archivedAt: null },
      _count: { _all: true },
    }),
    prisma.reservation.count({
      where: {
        organizationId,
        status: { in: ["REQUESTED", "APPROVED"] },
      },
    }),
    prisma.sale.groupBy({
      by: ["status"],
      where: { organizationId },
      _count: { _all: true },
    }),
    prisma.sale.aggregate({
      where: {
        organizationId,
        status: { in: ["CONTRACTED", "PAYMENT_IN_PROGRESS", "PAID", "HANDED_OVER"] },
      },
      _sum: { finalPrice: true },
    }),
    prisma.payment.aggregate({
      where: { organizationId, reversedAt: null },
      _sum: { amount: true },
    }),
    prisma.buyer.count({
      where: { organizationId, archivedAt: null },
    }),
    prisma.task.count({
      where: {
        organizationId,
        dueAt: { lt: startOfDay },
        completedAt: null,
      },
    }),
    prisma.task.count({
      where: {
        organizationId,
        dueAt: { gte: startOfDay, lt: endOfDay },
        completedAt: null,
      },
    }),
    prisma.reservation.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        createdAt: true,
        status: true,
        unit: { select: { code: true } },
        buyer: { select: { firstName: true, lastName: true } },
      },
    }),
    prisma.sale.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        createdAt: true,
        status: true,
        finalPrice: true,
        currency: true,
        unit: { select: { code: true } },
        buyer: { select: { firstName: true, lastName: true } },
      },
    }),
    prisma.paymentInstallment.findMany({
      where: {
        paymentPlan: { organizationId },
        status: { in: ["UPCOMING", "DUE", "PARTIALLY_PAID", "OVERDUE"] },
        dueDate: { gte: startOfDay, lte: in14 },
      },
      orderBy: { dueDate: "asc" },
      take: 8,
      select: {
        id: true,
        name: true,
        amount: true,
        dueDate: true,
        paymentPlan: {
          select: {
            saleId: true,
            currency: true,
            sale: { select: { unit: { select: { code: true } } } },
          },
        },
      },
    }),
  ]);

  const invGrouped: Record<UnitStatus, number> = {
    AVAILABLE: 0,
    ON_HOLD: 0,
    RESERVED: 0,
    DEPOSIT_PAID: 0,
    CONTRACTED: 0,
    SOLD: 0,
    BLOCKED: 0,
    NOT_FOR_SALE: 0,
  };
  for (const row of inventoryGroup) {
    invGrouped[row.status] = row._count._all;
  }
  const unitsTotal = Object.values(invGrouped).reduce((a, b) => a + b, 0);

  const contracted = toDecimal(salesFinancialAgg._sum.finalPrice ?? 0);
  const paid = toDecimal(paymentsAgg._sum.amount ?? 0);
  const outstanding = contracted.minus(paid);

  return {
    totals: {
      projects: projectsCount,
      unitsAvailable: invGrouped.AVAILABLE,
      unitsReserved: invGrouped.RESERVED + invGrouped.DEPOSIT_PAID,
      unitsContracted: invGrouped.CONTRACTED,
      unitsSold: invGrouped.SOLD,
      unitsTotal,
      activeReservations: reservationsActive,
      activeSales: salesByStatus
        .filter((s) => s.status !== "CANCELED")
        .reduce((a, b) => a + b._count._all, 0),
      buyersActive,
      tasksOverdue,
      tasksToday,
    },
    financial: {
      salesContractedTotal: contracted.toString(),
      salesPaidTotal: paid.toString(),
      salesOutstandingTotal: outstanding.lt(0) ? "0" : outstanding.toString(),
      currency: "EUR",
    },
    inventoryByStatus: (Object.keys(invGrouped) as UnitStatus[]).map((status) => ({
      status,
      count: invGrouped[status],
    })),
    salesByStatus: salesByStatus.map((row) => ({
      status: row.status,
      count: row._count._all,
    })),
    recentReservations: recentReservations.map((r) => ({
      id: r.id,
      createdAt: r.createdAt,
      unitCode: r.unit?.code ?? "—",
      buyerName: r.buyer ? `${r.buyer.firstName} ${r.buyer.lastName}` : "—",
      status: r.status,
    })),
    recentSales: recentSales.map((s) => ({
      id: s.id,
      createdAt: s.createdAt,
      unitCode: s.unit.code,
      buyerName: `${s.buyer.firstName} ${s.buyer.lastName}`,
      status: s.status,
      finalPrice: s.finalPrice.toString(),
      currency: s.currency,
    })),
    upcomingInstallments: upcomingInstallments.map((i) => ({
      id: i.id,
      saleId: i.paymentPlan.saleId,
      unitCode: i.paymentPlan.sale?.unit?.code ?? "—",
      name: i.name,
      amount: i.amount.toString(),
      currency: i.paymentPlan.currency,
      dueDate: i.dueDate,
    })),
  };
}

// -----------------------------------------------------------------------------
// Agency
// -----------------------------------------------------------------------------

export interface AgencyDashboard {
  totals: {
    activeConnections: number;
    accessibleProjects: number;
    activeBuyers: number;
    activeRegistrations: number;
    activeReservations: number;
    pendingCommissions: number;
  };
  financial: {
    commissionCalculatedTotal: string;
    commissionApprovedTotal: string;
    commissionPaidTotal: string;
    currency: string;
  };
  recentRegistrations: Array<{
    id: string;
    createdAt: Date;
    status: string;
    projectName: string;
    buyerName: string;
  }>;
  recentReservations: Array<{
    id: string;
    createdAt: Date;
    status: string;
    unitCode: string;
  }>;
}

export async function loadAgencyDashboard(
  agencyOrganizationId: string,
): Promise<AgencyDashboard> {
  const [
    activeConnections,
    accessibleProjects,
    activeBuyers,
    activeRegistrations,
    activeReservations,
    pendingCommissions,
    commissionAggs,
    recentRegistrations,
    recentReservations,
  ] = await Promise.all([
    prisma.agencyConnection.count({
      where: { agencyOrganizationId, status: "ACTIVE" },
    }),
    prisma.agencyProjectAccess.count({
      where: {
        status: "ACTIVE",
        agencyConnection: { agencyOrganizationId, status: "ACTIVE" },
      },
    }),
    prisma.buyer.count({
      where: { organizationId: agencyOrganizationId, archivedAt: null },
    }),
    prisma.agencyBuyerRegistration.count({
      where: {
        agencyOrganizationId,
        status: { in: ["PENDING", "APPROVED", "CONFLICT_REVIEW"] },
      },
    }),
    prisma.reservation.count({
      where: {
        agencyOrganizationId,
        status: { in: ["REQUESTED", "APPROVED"] },
      },
    }),
    prisma.commission.count({
      where: {
        agencyOrganizationId,
        status: { in: ["CALCULATED", "APPROVED", "INVOICED", "DUE"] },
      },
    }),
    prisma.commission.groupBy({
      by: ["status"],
      where: { agencyOrganizationId },
      _sum: { calculatedAmount: true, adjustedAmount: true },
    }),
    prisma.agencyBuyerRegistration.findMany({
      where: { agencyOrganizationId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        createdAt: true,
        status: true,
        project: { select: { name: true } },
        buyer: { select: { firstName: true, lastName: true } },
      },
    }),
    prisma.reservation.findMany({
      where: { agencyOrganizationId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        createdAt: true,
        status: true,
        unit: { select: { code: true } },
      },
    }),
  ]);

  const commissionByStatus = new Map<string, Decimal>();
  for (const row of commissionAggs) {
    const value = toDecimal(
      row._sum.adjustedAmount ?? row._sum.calculatedAmount ?? 0,
    );
    commissionByStatus.set(row.status, value);
  }
  const calculated = new Decimal(0)
    .plus(commissionByStatus.get("CALCULATED") ?? 0)
    .plus(commissionByStatus.get("APPROVED") ?? 0)
    .plus(commissionByStatus.get("INVOICED") ?? 0)
    .plus(commissionByStatus.get("DUE") ?? 0);

  return {
    totals: {
      activeConnections,
      accessibleProjects,
      activeBuyers,
      activeRegistrations,
      activeReservations,
      pendingCommissions,
    },
    financial: {
      commissionCalculatedTotal: calculated.toString(),
      commissionApprovedTotal: (commissionByStatus.get("APPROVED") ?? new Decimal(0)).toString(),
      commissionPaidTotal: (commissionByStatus.get("PAID") ?? new Decimal(0)).toString(),
      currency: "EUR",
    },
    recentRegistrations: recentRegistrations.map((r) => ({
      id: r.id,
      createdAt: r.createdAt,
      status: r.status,
      projectName: r.project.name,
      buyerName: `${r.buyer.firstName} ${r.buyer.lastName}`,
    })),
    recentReservations: recentReservations.map((r) => ({
      id: r.id,
      createdAt: r.createdAt,
      status: r.status,
      unitCode: r.unit?.code ?? "—",
    })),
  };
}

// -----------------------------------------------------------------------------
// Platform admin
// -----------------------------------------------------------------------------

export interface PlatformDashboard {
  totals: {
    totalOrganizations: number;
    activeOrganizations: number;
    trialOrganizations: number;
    suspendedOrganizations: number;
    totalUsers: number;
    totalProjects: number;
    totalUnits: number;
    totalSales: number;
    activeReservations: number;
  };
  organizationsByType: Array<{ type: string; count: number }>;
  organizationsByStatus: Array<{ status: string; count: number }>;
  recentAudit: Array<{
    id: string;
    action: string;
    entityType: string;
    entityId: string | null;
    createdAt: Date;
    actorEmail: string | null;
    organizationName: string | null;
  }>;
  trialsExpiringSoon: Array<{
    id: string;
    organizationName: string;
    trialEndsAt: Date;
  }>;
}

export async function loadPlatformDashboard(): Promise<PlatformDashboard> {
  const now = new Date();
  const in7 = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [
    totalOrganizations,
    orgProfilesByStatus,
    orgProfilesByType,
    totalUsers,
    totalProjects,
    totalUnits,
    totalSales,
    activeReservations,
    recentAudit,
    trialsExpiring,
  ] = await Promise.all([
    prisma.organization.count(),
    prisma.organizationProfile.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
    prisma.organizationProfile.groupBy({
      by: ["type"],
      _count: { _all: true },
    }),
    prisma.user.count(),
    prisma.project.count({ where: { archivedAt: null } }),
    prisma.unit.count({ where: { archivedAt: null } }),
    prisma.sale.count({ where: { status: { not: "CANCELED" } } }),
    prisma.reservation.count({
      where: { status: { in: ["REQUESTED", "APPROVED"] } },
    }),
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 15,
      select: {
        id: true,
        action: true,
        entityType: true,
        entityId: true,
        createdAt: true,
        actor: { select: { email: true } },
        organization: { select: { name: true } },
      },
    }),
    prisma.organizationSubscription.findMany({
      where: {
        status: "TRIAL",
        trialEndsAt: { gte: now, lte: in7 },
      },
      orderBy: { trialEndsAt: "asc" },
      take: 10,
      include: { organization: { select: { name: true } } },
    }),
  ]);

  const byStatus = new Map<string, number>();
  for (const row of orgProfilesByStatus) {
    byStatus.set(row.status, row._count._all);
  }
  const byType = new Map<string, number>();
  for (const row of orgProfilesByType) {
    byType.set(row.type, row._count._all);
  }

  return {
    totals: {
      totalOrganizations,
      activeOrganizations: byStatus.get("ACTIVE") ?? 0,
      trialOrganizations: byStatus.get("TRIAL") ?? 0,
      suspendedOrganizations: byStatus.get("SUSPENDED") ?? 0,
      totalUsers,
      totalProjects,
      totalUnits,
      totalSales,
      activeReservations,
    },
    organizationsByType: Array.from(byType.entries()).map(([type, count]) => ({ type, count })),
    organizationsByStatus: Array.from(byStatus.entries()).map(([status, count]) => ({
      status,
      count,
    })),
    recentAudit: recentAudit.map((row) => ({
      id: row.id,
      action: row.action,
      entityType: row.entityType,
      entityId: row.entityId,
      createdAt: row.createdAt,
      actorEmail: row.actor?.email ?? null,
      organizationName: row.organization?.name ?? null,
    })),
    trialsExpiringSoon: trialsExpiring.map((s) => ({
      id: s.id,
      organizationName: s.organization.name,
      trialEndsAt: s.trialEndsAt as Date,
    })),
  };
}
