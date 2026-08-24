import "server-only";
import type { Prisma, UnitStatus, UnitType } from "@prisma/client";

import { prisma } from "@/server/db/prisma";
import { DomainErrors } from "@/lib/errors";
import { createReservation } from "@/server/services/reservations.service";
import {
  toAgencyProjectDto,
  toAgencyUnitDto,
  type AgencyProjectDto,
  type AgencyUnitDto,
} from "./dtos";

/**
 * Agency offer / catalog service.
 *
 * Answers "what can this agency see and reserve?" by walking the visibility
 * chain end-to-end:
 *
 *   AgencyConnection (ACTIVE)
 *     -> AgencyProjectAccess (ACTIVE, within accessStartsAt..accessEndsAt)
 *       -> Unit (isVisibleToAgencies OR AgencyUnitAccessOverride.visible=true)
 *          - hidden entirely when an override says visible=false
 *
 * The response is built via the agency-safe DTOs, so investor-internal
 * fields are physically absent from the payload. Reservations from the
 * agency portal delegate to the shared `createReservation` with the AGENCY
 * source type set — everything downstream (single-active invariant, unit
 * status transitions, notifications) is identical to internal reservations.
 */

function isAccessInWindow(access: {
  accessStartsAt: Date | null;
  accessEndsAt: Date | null;
}): boolean {
  const now = new Date();
  if (access.accessStartsAt && access.accessStartsAt > now) return false;
  if (access.accessEndsAt && access.accessEndsAt < now) return false;
  return true;
}

// -----------------------------------------------------------------------------
// Projects
// -----------------------------------------------------------------------------

export async function listOfferProjects(input: {
  agencyOrganizationId: string;
}): Promise<AgencyProjectDto[]> {
  const accessRows = await prisma.agencyProjectAccess.findMany({
    where: {
      status: "ACTIVE",
      agencyConnection: {
        agencyOrganizationId: input.agencyOrganizationId,
        status: "ACTIVE",
      },
    },
    include: {
      project: true,
    },
  });

  const eligible = accessRows.filter(isAccessInWindow);
  return eligible
    .filter((a) => a.project.archivedAt == null)
    .map((a) => toAgencyProjectDto(a.project));
}

interface AccessContext {
  accessId: string;
  connectionId: string;
  investorOrganizationId: string;
  canViewPrices: boolean;
  canViewFloorPlans: boolean;
  canRequestReservations: boolean;
  showOnlyAgencyVisibleUnits: boolean;
}

async function loadAccessForAgencyProject(input: {
  agencyOrganizationId: string;
  projectId: string;
}): Promise<AccessContext | null> {
  const access = await prisma.agencyProjectAccess.findFirst({
    where: {
      projectId: input.projectId,
      status: "ACTIVE",
      agencyConnection: {
        agencyOrganizationId: input.agencyOrganizationId,
        status: "ACTIVE",
      },
    },
    include: { agencyConnection: true },
  });
  if (!access) return null;
  if (!isAccessInWindow(access)) return null;
  return {
    accessId: access.id,
    connectionId: access.agencyConnectionId,
    investorOrganizationId: access.agencyConnection.investorOrganizationId,
    canViewPrices: access.canViewPrices,
    canViewFloorPlans: access.canViewFloorPlans,
    canRequestReservations: access.canRequestReservations,
    showOnlyAgencyVisibleUnits: access.showOnlyAgencyVisibleUnits,
  };
}

export async function getOfferProject(input: {
  agencyOrganizationId: string;
  projectId: string;
}): Promise<{ project: AgencyProjectDto; access: AccessContext } | null> {
  const access = await loadAccessForAgencyProject(input);
  if (!access) return null;
  const project = await prisma.project.findFirst({
    where: {
      id: input.projectId,
      organizationId: access.investorOrganizationId,
      archivedAt: null,
    },
  });
  if (!project) return null;
  return { project: toAgencyProjectDto(project), access };
}

// -----------------------------------------------------------------------------
// Units
// -----------------------------------------------------------------------------

export interface ListOfferUnitsInput {
  agencyOrganizationId: string;
  projectId: string;
  page: number;
  pageSize: number;
  status?: UnitStatus[];
  type?: UnitType[];
  priceMin?: number;
  priceMax?: number;
  areaMin?: number;
  areaMax?: number;
}

export async function listOfferUnits(input: ListOfferUnitsInput): Promise<{
  items: AgencyUnitDto[];
  total: number;
}> {
  const access = await loadAccessForAgencyProject({
    agencyOrganizationId: input.agencyOrganizationId,
    projectId: input.projectId,
  });
  if (!access) return { items: [], total: 0 };

  // Load per-unit overrides for this connection once.
  const overrides = await prisma.agencyUnitAccessOverride.findMany({
    where: { agencyConnectionId: access.connectionId },
    select: { unitId: true, visible: true },
  });
  const overrideVisible = new Set(overrides.filter((o) => o.visible).map((o) => o.unitId));
  const overrideHidden = new Set(overrides.filter((o) => !o.visible).map((o) => o.unitId));

  const visibilityFilter: Prisma.UnitWhereInput = access.showOnlyAgencyVisibleUnits
    ? {
        OR: [
          { isVisibleToAgencies: true },
          ...(overrideVisible.size > 0 ? [{ id: { in: [...overrideVisible] } }] : []),
        ],
      }
    : {};

  const where: Prisma.UnitWhereInput = {
    projectId: input.projectId,
    organizationId: access.investorOrganizationId,
    archivedAt: null,
    ...(overrideHidden.size > 0 ? { id: { notIn: [...overrideHidden] } } : {}),
    ...(input.status?.length ? { status: { in: input.status } } : {}),
    ...(input.type?.length ? { type: { in: input.type } } : {}),
    ...(input.priceMin != null || input.priceMax != null
      ? {
          basePrice: {
            ...(input.priceMin != null ? { gte: input.priceMin } : {}),
            ...(input.priceMax != null ? { lte: input.priceMax } : {}),
          },
        }
      : {}),
    ...(input.areaMin != null || input.areaMax != null
      ? {
          totalArea: {
            ...(input.areaMin != null ? { gte: input.areaMin } : {}),
            ...(input.areaMax != null ? { lte: input.areaMax } : {}),
          },
        }
      : {}),
    ...visibilityFilter,
  };

  const [total, rows] = await Promise.all([
    prisma.unit.count({ where }),
    prisma.unit.findMany({
      where,
      orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
      skip: (input.page - 1) * input.pageSize,
      take: input.pageSize,
      include: {
        project: { select: { id: true, name: true, code: true } },
        building: { select: { name: true, code: true } },
        entrance: { select: { name: true, code: true } },
        floor: { select: { label: true, number: true } },
      },
    }),
  ]);

  const items = rows.map((row) =>
    toAgencyUnitDto(row, {
      canViewPrices: access.canViewPrices,
      canViewFloorPlans: access.canViewFloorPlans,
    }),
  );
  return { items, total };
}

const AGENCY_PHOTO_VISIBILITY = ["AGENCY_SHARED", "BUYER_SHARED"] as const;

export interface AgencyUnitPhoto {
  id: string;
  fileName: string;
}

export async function getOfferUnit(input: {
  agencyOrganizationId: string;
  projectId: string;
  unitId: string;
}): Promise<{
  unit: AgencyUnitDto;
  access: AccessContext;
  photos: AgencyUnitPhoto[];
} | null> {
  const access = await loadAccessForAgencyProject({
    agencyOrganizationId: input.agencyOrganizationId,
    projectId: input.projectId,
  });
  if (!access) return null;

  const unit = await prisma.unit.findFirst({
    where: {
      id: input.unitId,
      projectId: input.projectId,
      organizationId: access.investorOrganizationId,
      archivedAt: null,
    },
    include: {
      project: { select: { id: true, name: true, code: true } },
      building: { select: { name: true, code: true } },
      entrance: { select: { name: true, code: true } },
      floor: { select: { label: true, number: true } },
    },
  });
  if (!unit) return null;
  if (!(await isUnitVisibleToAgency(access, unit))) return null;

  const photos = await prisma.document.findMany({
    where: {
      organizationId: access.investorOrganizationId,
      entityType: "Unit",
      entityId: unit.id,
      deletedAt: null,
      mimeType: { startsWith: "image/" },
      visibility: { in: [...AGENCY_PHOTO_VISIBILITY] },
    },
    orderBy: [{ isCover: "desc" }, { sortOrder: "asc" }, { createdAt: "desc" }],
    take: 24,
    select: { id: true, originalFileName: true },
  });

  return {
    unit: toAgencyUnitDto(unit, {
      canViewPrices: access.canViewPrices,
      canViewFloorPlans: access.canViewFloorPlans,
    }),
    access,
    photos: photos.map((p) => ({ id: p.id, fileName: p.originalFileName })),
  };
}

async function isUnitVisibleToAgency(
  access: AccessContext,
  unit: { id: string; isVisibleToAgencies: boolean },
): Promise<boolean> {
  const override = await prisma.agencyUnitAccessOverride.findUnique({
    where: {
      agencyConnectionId_unitId: {
        agencyConnectionId: access.connectionId,
        unitId: unit.id,
      },
    },
    select: { visible: true },
  });
  if (override?.visible === false) return false;
  if (access.showOnlyAgencyVisibleUnits && !unit.isVisibleToAgencies && override?.visible !== true) {
    return false;
  }
  return true;
}

// -----------------------------------------------------------------------------
// Agency reservation
// -----------------------------------------------------------------------------

export interface CreateAgencyReservationInput {
  agencyOrganizationId: string;
  actorUserId: string;
  unitId: string;
  buyerId: string;
  reservationAmount?: number | null;
  currency?: string;
  notes?: string | null;
}

/**
 * Agency-scoped reservation. Verifies the agency has an ACTIVE connection
 * with an ACTIVE project-access grant that permits reservations, then
 * delegates to the shared `createReservation` (Phase 3) with `sourceType:
 * "AGENCY"`. The reservation is persisted under the INVESTOR org, so all
 * subsequent read/write access from the agency portal must go through the
 * agency-scoped list endpoints.
 *
 * The buyer must be one the agency itself registered (i.e. lives in the
 * agency org). This service does NOT allow an agency to bind an investor's
 * private buyer to a reservation.
 */
export async function createAgencyReservation(input: CreateAgencyReservationInput) {
  const unit = await prisma.unit.findFirst({
    where: { id: input.unitId, archivedAt: null },
    select: { id: true, organizationId: true, projectId: true, isVisibleToAgencies: true },
  });
  if (!unit) throw DomainErrors.notFound("Jedinica");

  const access = await loadAccessForAgencyProject({
    agencyOrganizationId: input.agencyOrganizationId,
    projectId: unit.projectId,
  });
  if (!access || access.investorOrganizationId !== unit.organizationId) {
    throw DomainErrors.notFound("Jedinica");
  }
  if (!access.canRequestReservations) {
    throw DomainErrors.forbidden(
      "Vaša agencija nema dozvolu za kreiranje rezervacija na ovom projektu.",
    );
  }

  if (!(await isUnitVisibleToAgency(access, unit))) {
    throw DomainErrors.notFound("Jedinica");
  }

  // Ensure the buyer is owned by the agency org.
  const buyer = await prisma.buyer.findFirst({
    where: { id: input.buyerId, organizationId: input.agencyOrganizationId },
    select: { id: true },
  });
  if (!buyer) throw DomainErrors.notFound("Kupac");

  // The reservation must be persisted under the INVESTOR org (that's where
  // the unit lives). The buyer is owned by the agency; the reservation
  // service will still create a scoped copy under the investor org as part
  // of Phase 5's convert flow. For Phase 4 we mirror the buyer identity via
  // `agencyOrganizationId` — no buyer copy is created here.
  const investorBuyer = await ensureInvestorBuyerMirror({
    investorOrganizationId: access.investorOrganizationId,
    agencyOrganizationId: input.agencyOrganizationId,
    agencyBuyerId: input.buyerId,
  });

  return createReservation({
    organizationId: access.investorOrganizationId,
    actorUserId: input.actorUserId,
    unitId: input.unitId,
    buyerId: investorBuyer.id,
    reservationAmount: input.reservationAmount ?? null,
    currency: input.currency,
    notes: input.notes ?? null,
    sourceType: "AGENCY",
    agencyOrganizationId: input.agencyOrganizationId,
    agencyAgentUserId: input.actorUserId,
  });
}

/**
 * The agency owns its buyer records. To bind a reservation to the investor
 * tenancy without leaking the agency's raw buyer between tenants, we create
 * a shallow "mirror" buyer under the investor org that reuses the same
 * contact identifiers. Duplicate mirrors are collapsed by normalized phone.
 *
 * NOTE: this is intentionally minimal for Phase 4. Phase 5's SaleService
 * will extend the same mirror when a reservation is converted to a sale.
 */
async function ensureInvestorBuyerMirror(input: {
  investorOrganizationId: string;
  agencyOrganizationId: string;
  agencyBuyerId: string;
}) {
  const agencyBuyer = await prisma.buyer.findFirst({
    where: { id: input.agencyBuyerId, organizationId: input.agencyOrganizationId },
  });
  if (!agencyBuyer) throw DomainErrors.notFound("Kupac");

  const existing = await prisma.buyer.findFirst({
    where: {
      organizationId: input.investorOrganizationId,
      normalizedPhone: agencyBuyer.normalizedPhone,
    },
    select: { id: true },
  });
  if (existing) return existing;

  const created = await prisma.buyer.create({
    data: {
      organizationId: input.investorOrganizationId,
      firstName: agencyBuyer.firstName,
      lastName: agencyBuyer.lastName,
      email: agencyBuyer.email,
      normalizedEmail: agencyBuyer.normalizedEmail,
      phone: agencyBuyer.phone,
      normalizedPhone: agencyBuyer.normalizedPhone,
      preferredContactMethod: agencyBuyer.preferredContactMethod,
      status: "NEW",
      source: `Agencija: ${input.agencyOrganizationId}`,
      assignedUserId: null,
    },
    select: { id: true },
  });
  return created;
}
