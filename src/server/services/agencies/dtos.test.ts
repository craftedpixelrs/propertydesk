import { describe, expect, it } from "vitest";
import type { Project, Unit } from "@prisma/client";
import Decimal from "decimal.js";

import { toAgencyProjectDto, toAgencyUnitDto } from "./dtos";

/**
 * DTO privacy tests.
 *
 * The DTOs are the last line of defense between the investor's private data
 * and an agency user. These assertions codify that:
 *   - `internalNotes` is absent from both DTOs
 *   - price fields disappear when `canViewPrices` is false
 *   - `floorPlanUrl` disappears when `canViewFloorPlans` is false
 *   - `priceHistory` / `statusHistory` are never embedded (they're relations)
 */

const projectRow: Project = {
  id: "proj-1",
  organizationId: "inv-1",
  code: "P-1",
  name: "Test Projekat",
  slug: "test-projekat",
  description: "Public description",
  address: null,
  city: "Beograd",
  municipality: null,
  postalCode: null,
  latitude: null,
  longitude: null,
  projectStatus: "ACTIVE_SALES",
  salesStartDate: null,
  constructionStartDate: null,
  expectedCompletionDate: null,
  completedAt: null,
  defaultCurrency: "EUR",
  defaultVatRate: null,
  coverImageUrl: null,
  internalNotes: "TOP SECRET investor notes",
  isActive: true,
  createdByUserId: "u-1",
  createdAt: new Date(),
  updatedAt: new Date(),
  archivedAt: null,
} as Project;

const unitRow: Unit & { project: { id: string; name: string; code: string } } = {
  id: "unit-1",
  organizationId: "inv-1",
  projectId: "proj-1",
  buildingId: null,
  entranceId: null,
  floorId: null,
  code: "A-101",
  type: "APARTMENT",
  status: "AVAILABLE",
  structure: "2.0",
  roomCount: new Decimal(2),
  totalArea: new Decimal(65),
  internalArea: new Decimal(55),
  terraceArea: new Decimal(5),
  gardenArea: null,
  orientation: "S",
  basePrice: new Decimal(120000),
  finalPrice: new Decimal(115000),
  pricePerSquareMeter: new Decimal(1846),
  currency: "EUR",
  vatRate: null,
  vatIncluded: false,
  bedrooms: 1,
  bathrooms: 1,
  hasTerrace: true,
  hasGarden: false,
  floorPlanUrl: "https://example.com/plan.pdf",
  publicDescription: "Nice apartment",
  internalNotes: "TOP SECRET unit notes",
  isVisibleToAgencies: true,
  sortOrder: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
  archivedAt: null,
  version: 0,
  project: { id: "proj-1", name: "Test Projekat", code: "P-1" },
} as unknown as Unit & { project: { id: string; name: string; code: string } };

describe("agency DTOs", () => {
  it("never exposes internalNotes on a project", () => {
    const dto = toAgencyProjectDto(projectRow);
    expect(dto).not.toHaveProperty("internalNotes");
  });

  it("never exposes internalNotes on a unit", () => {
    const dto = toAgencyUnitDto(unitRow, { canViewPrices: true, canViewFloorPlans: true });
    expect(dto).not.toHaveProperty("internalNotes");
  });

  it("does not embed priceHistory or statusHistory on a unit DTO", () => {
    const dto = toAgencyUnitDto(unitRow, { canViewPrices: true, canViewFloorPlans: true });
    expect(dto).not.toHaveProperty("priceHistory");
    expect(dto).not.toHaveProperty("statusHistory");
  });

  it("hides price when canViewPrices is false", () => {
    const dto = toAgencyUnitDto(unitRow, { canViewPrices: false, canViewFloorPlans: true });
    expect(dto.price).toBeNull();
  });

  it("emits price when canViewPrices is true", () => {
    const dto = toAgencyUnitDto(unitRow, { canViewPrices: true, canViewFloorPlans: true });
    expect(dto.price).not.toBeNull();
    expect(dto.price?.base).toBe("120000");
    expect(dto.price?.currency).toBe("EUR");
  });

  it("hides floorPlanUrl when canViewFloorPlans is false", () => {
    const dto = toAgencyUnitDto(unitRow, { canViewPrices: true, canViewFloorPlans: false });
    expect(dto.floorPlanUrl).toBeNull();
  });

  it("maps building, entrance and floor for the agency sheet", () => {
    const dto = toAgencyUnitDto(
      {
        ...unitRow,
        building: { name: "Lamela A", code: "A" },
        entrance: { name: "Ulaz A1", code: "A1" },
        floor: { label: "4", number: 4 },
      },
      { canViewPrices: true, canViewFloorPlans: true },
    );
    expect(dto.building).toBe("Lamela A");
    expect(dto.entrance).toBe("Ulaz A1");
    expect(dto.floor).toBe("4");
  });
});
