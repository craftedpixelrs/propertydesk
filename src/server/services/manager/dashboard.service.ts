import "server-only";

import { prisma } from "@/server/db/prisma";

/**
 * Faza 11 — manager dashboard aggregate.
 *
 * Returns the headline KPIs for the manager landing page:
 *   - buildings + units count (active)
 *   - current month billing (generated vs collected)
 *   - total open debt across all buildings
 *   - open maintenance tickets
 *   - next 5 upcoming assemblies
 */

export interface ManagerDashboardData {
  totals: {
    buildings: number;
    units: number;
    openTickets: number;
    openAssemblies: number;
  };
  currentMonth: {
    year: number;
    month: number;
    chargedTotal: number;
    paidTotal: number;
    chargeCount: number;
  };
  debt: {
    outstandingTotal: number;
    chargesOpen: number;
  };
  upcomingAssemblies: Array<{
    id: string;
    buildingName: string;
    title: string;
    scheduledAt: Date;
    status: string;
  }>;
  recentTickets: Array<{
    id: string;
    buildingName: string;
    title: string;
    status: string;
    createdAt: Date;
  }>;
}

export async function loadManagerDashboard(organizationId: string): Promise<ManagerDashboardData> {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const [buildings, units, openTickets, openAssemblies, monthAgg, debtAgg, assemblies, tickets] =
    await Promise.all([
      prisma.managedBuilding.count({ where: { organizationId, archivedAt: null } }),
      prisma.managedUnit.count({ where: { organizationId, archivedAt: null } }),
      prisma.maintenanceTicket.count({
        where: {
          organizationId,
          status: { in: ["OPEN", "TRIAGED", "IN_PROGRESS", "AWAITING_PARTS"] },
        },
      }),
      prisma.assembly.count({
        where: {
          organizationId,
          status: { in: ["SCHEDULED", "OPEN_FOR_VOTING"] },
        },
      }),
      prisma.duesCharge.aggregate({
        where: { organizationId, periodYear: year, periodMonth: month },
        _sum: { totalAmount: true, paidAmount: true },
        _count: { _all: true },
      }),
      prisma.duesCharge.aggregate({
        where: { organizationId, status: { in: ["OPEN", "PARTIALLY_PAID"] } },
        _sum: { totalAmount: true, paidAmount: true },
        _count: { _all: true },
      }),
      prisma.assembly.findMany({
        where: {
          organizationId,
          status: { in: ["SCHEDULED", "OPEN_FOR_VOTING"] },
          scheduledAt: { gte: now },
        },
        orderBy: { scheduledAt: "asc" },
        take: 5,
        select: {
          id: true,
          title: true,
          scheduledAt: true,
          status: true,
          building: { select: { name: true } },
        },
      }),
      prisma.maintenanceTicket.findMany({
        where: {
          organizationId,
          status: { in: ["OPEN", "TRIAGED", "IN_PROGRESS", "AWAITING_PARTS"] },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          title: true,
          status: true,
          createdAt: true,
          building: { select: { name: true } },
        },
      }),
    ]);

  return {
    totals: {
      buildings,
      units,
      openTickets,
      openAssemblies,
    },
    currentMonth: {
      year,
      month,
      chargedTotal: Number(monthAgg._sum.totalAmount ?? 0),
      paidTotal: Number(monthAgg._sum.paidAmount ?? 0),
      chargeCount: monthAgg._count._all,
    },
    debt: {
      outstandingTotal:
        Number(debtAgg._sum.totalAmount ?? 0) - Number(debtAgg._sum.paidAmount ?? 0),
      chargesOpen: debtAgg._count._all,
    },
    upcomingAssemblies: assemblies.map((a) => ({
      id: a.id,
      buildingName: a.building.name,
      title: a.title,
      scheduledAt: a.scheduledAt,
      status: a.status,
    })),
    recentTickets: tickets.map((t) => ({
      id: t.id,
      buildingName: t.building.name,
      title: t.title,
      status: t.status,
      createdAt: t.createdAt,
    })),
  };
}
