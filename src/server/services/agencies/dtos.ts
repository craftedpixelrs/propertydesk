import "server-only";
import type { Project, Unit, UnitStatus, UnitType } from "@prisma/client";

/**
 * Agency-safe DTOs.
 *
 * CRITICAL: agencies must never see investor-internal data. To make it
 * impossible to accidentally leak a field, these builders use **explicit
 * allowlist mapping** — they never spread a Prisma row. Adding a field
 * requires a code change here (and a code review).
 *
 * Investor-only fields that are NEVER emitted:
 *   - internalNotes (Project, Unit)
 *   - priceHistory / statusHistory (Unit relations, not embedded)
 *   - other agencies' data (excluded at the query layer, not here)
 *   - discountValue / VAT internals below the surface price
 *
 * Additionally, when `canViewPrices=false` on the connection's project
 * access, the DTO omits price fields.
 */

export interface AgencyProjectDto {
  id: string;
  code: string;
  name: string;
  slug: string;
  city: string | null;
  address: string | null;
  description: string | null;
  projectStatus: string;
  coverImageUrl: string | null;
  defaultCurrency: string;
  expectedCompletionDate: Date | null;
}

export interface AgencyUnitDto {
  id: string;
  code: string;
  type: UnitType;
  status: UnitStatus;
  structure: string | null;
  roomCount: string | null;
  totalArea: string;
  internalArea: string | null;
  terraceArea: string | null;
  gardenArea: string | null;
  orientation: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  hasTerrace: boolean;
  hasGarden: boolean;
  publicDescription: string | null;
  floorPlanUrl: string | null;
  building: string | null;
  entrance: string | null;
  floor: string | null;
  price: {
    base: string;
    final: string | null;
    perSquareMeter: string | null;
    currency: string;
  } | null;
  project: { id: string; name: string; code: string };
}

export function toAgencyProjectDto(project: Project): AgencyProjectDto {
  return {
    id: project.id,
    code: project.code,
    name: project.name,
    slug: project.slug,
    city: project.city,
    address: project.address,
    description: project.description,
    projectStatus: project.projectStatus,
    coverImageUrl: project.coverImageUrl,
    defaultCurrency: project.defaultCurrency,
    expectedCompletionDate: project.expectedCompletionDate,
  };
}

/**
 * Convert a Prisma Unit row + its parent project fields into the agency DTO.
 *
 * `canViewPrices` gates the price block. `canViewFloorPlans` gates the
 * floor plan URL. Callers must pass both flags from the connection's
 * `AgencyProjectAccess`.
 */
type AgencyUnitSource = Unit & {
  project: { id: string; name: string; code: string };
  building?: { name: string; code: string } | null;
  entrance?: { name: string; code: string } | null;
  floor?: { label: string; number: number | null } | null;
};

export function toAgencyUnitDto(
  unit: AgencyUnitSource,
  flags: { canViewPrices: boolean; canViewFloorPlans: boolean },
): AgencyUnitDto {
  return {
    id: unit.id,
    code: unit.code,
    type: unit.type,
    status: unit.status,
    structure: unit.structure,
    roomCount: unit.roomCount ? unit.roomCount.toString() : null,
    totalArea: unit.totalArea.toString(),
    internalArea: unit.internalArea ? unit.internalArea.toString() : null,
    terraceArea: unit.terraceArea ? unit.terraceArea.toString() : null,
    gardenArea: unit.gardenArea ? unit.gardenArea.toString() : null,
    orientation: unit.orientation,
    bedrooms: unit.bedrooms,
    bathrooms: unit.bathrooms,
    hasTerrace: unit.hasTerrace,
    hasGarden: unit.hasGarden,
    publicDescription: unit.publicDescription,
    floorPlanUrl: flags.canViewFloorPlans ? unit.floorPlanUrl : null,
    building: unit.building?.name ?? unit.building?.code ?? null,
    entrance: unit.entrance?.name ?? unit.entrance?.code ?? null,
    floor:
      unit.floor?.label ??
      (unit.floor?.number != null ? String(unit.floor.number) : null),
    price: flags.canViewPrices
      ? {
          base: unit.basePrice.toString(),
          final: unit.finalPrice ? unit.finalPrice.toString() : null,
          perSquareMeter: unit.pricePerSquareMeter
            ? unit.pricePerSquareMeter.toString()
            : null,
          currency: unit.currency,
        }
      : null,
    project: unit.project,
  };
}
