import "server-only";
import type { Prisma, UnitStatus, UnitType } from "@prisma/client";

import { prisma } from "@/server/db/prisma";
import { DomainErrors } from "@/lib/errors";

const TEASER_UNIT_STATUSES: UnitStatus[] = ["AVAILABLE", "RESERVED"];

export interface NetworkCatalogTeaser {
  projectId: string;
  name: string;
  city: string | null;
  municipality: string | null;
  coverImageUrl: string | null;
  expectedCompletionDate: Date | null;
  currency: string;
  availableCount: number;
  unitTypes: UnitType[];
  priceMin: string | null;
  priceMax: string | null;
  investor: {
    organizationId: string;
    displayName: string;
  };
  alreadyConnected: boolean;
  pendingRequest: boolean;
}

/**
 * Teaser catalogue for verified-or-pending agencies.
 *
 * Only projects with `networkCatalogEnabled` are listed. Exact unit
 * rows, floor plans, addresses and internal notes stay out — those
 * require an ACTIVE connection + AgencyProjectAccess.
 */
export async function listNetworkCatalog(input: {
  agencyOrganizationId: string;
}): Promise<NetworkCatalogTeaser[]> {
  const agency = await prisma.organizationProfile.findUnique({
    where: { organizationId: input.agencyOrganizationId },
    select: { type: true, status: true },
  });
  if (!agency || agency.type !== "AGENCY") {
    throw DomainErrors.forbidden("Katalog je dostupan samo agencijama.");
  }
  if (agency.status === "SUSPENDED" || agency.status === "CLOSED") {
    throw DomainErrors.forbidden("Nalog agencije nije aktivan.");
  }

  const [projects, connections, pending] = await Promise.all([
    prisma.project.findMany({
      where: {
        networkCatalogEnabled: true,
        archivedAt: null,
        isActive: true,
        projectStatus: { notIn: ["DRAFT", "ARCHIVED"] },
        organization: { profile: { type: "INVESTOR", status: "ACTIVE" } },
      },
      select: {
        id: true,
        name: true,
        city: true,
        municipality: true,
        coverImageUrl: true,
        expectedCompletionDate: true,
        defaultCurrency: true,
        organizationId: true,
        organization: {
          select: {
            name: true,
            profile: { select: { displayName: true } },
          },
        },
      },
      orderBy: [{ city: "asc" }, { name: "asc" }],
    }),
    prisma.agencyConnection.findMany({
      where: {
        agencyOrganizationId: input.agencyOrganizationId,
        status: { in: ["ACTIVE", "INVITED"] },
      },
      select: { investorOrganizationId: true, status: true },
    }),
    prisma.agencyConnectionRequest.findMany({
      where: {
        agencyOrganizationId: input.agencyOrganizationId,
        status: "PENDING",
      },
      select: { investorOrganizationId: true },
    }),
  ]);

  const connected = new Set(connections.map((c) => c.investorOrganizationId));
  const pendingInvestors = new Set(pending.map((r) => r.investorOrganizationId));

  if (projects.length === 0) return [];

  const projectIds = projects.map((p) => p.id);
  const units = await prisma.unit.groupBy({
    by: ["projectId", "type", "status"],
    where: {
      projectId: { in: projectIds },
      status: { in: TEASER_UNIT_STATUSES },
    },
    _count: { _all: true },
    _min: { finalPrice: true, basePrice: true },
    _max: { finalPrice: true, basePrice: true },
  });

  type Agg = {
    availableCount: number;
    types: Set<UnitType>;
    priceMin: Prisma.Decimal | null;
    priceMax: Prisma.Decimal | null;
  };
  const byProject = new Map<string, Agg>();
  for (const row of units) {
    const current = byProject.get(row.projectId) ?? {
      availableCount: 0,
      types: new Set<UnitType>(),
      priceMin: null,
      priceMax: null,
    };
    if (row.status === "AVAILABLE") {
      current.availableCount += row._count._all;
    }
    current.types.add(row.type);
    const rowMin = row._min.finalPrice ?? row._min.basePrice;
    const rowMax = row._max.finalPrice ?? row._max.basePrice;
    if (rowMin && (current.priceMin == null || rowMin.lt(current.priceMin))) {
      current.priceMin = rowMin;
    }
    if (rowMax && (current.priceMax == null || rowMax.gt(current.priceMax))) {
      current.priceMax = rowMax;
    }
    byProject.set(row.projectId, current);
  }

  return projects.map((project) => {
    const stats = byProject.get(project.id);
    return {
      projectId: project.id,
      name: project.name,
      city: project.city,
      municipality: project.municipality,
      coverImageUrl: project.coverImageUrl,
      expectedCompletionDate: project.expectedCompletionDate,
      currency: project.defaultCurrency,
      availableCount: stats?.availableCount ?? 0,
      unitTypes: stats ? [...stats.types] : [],
      priceMin: stats?.priceMin?.toFixed(2) ?? null,
      priceMax: stats?.priceMax?.toFixed(2) ?? null,
      investor: {
        organizationId: project.organizationId,
        displayName:
          project.organization.profile?.displayName?.trim() ||
          project.organization.name,
      },
      alreadyConnected: connected.has(project.organizationId),
      pendingRequest: pendingInvestors.has(project.organizationId),
    };
  });
}
