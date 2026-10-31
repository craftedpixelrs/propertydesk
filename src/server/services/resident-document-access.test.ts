import { describe, expect, it } from "vitest";

import { residentMayReadDocument } from "./resident-document-access";

const base = {
  personId: "person-1",
  buildingIds: ["bld-1"],
  unitIds: ["unit-1"],
};

describe("residentMayReadDocument", () => {
  it("shows a shared building file only to residents of that building", () => {
    expect(
      residentMayReadDocument({
        ...base,
        entityType: "ManagedBuilding",
        visibility: "RESIDENT_SHARED",
        entityBuildingId: "bld-1",
      }),
    ).toBe(true);
    expect(
      residentMayReadDocument({
        ...base,
        entityType: "ManagedBuilding",
        visibility: "INTERNAL",
        entityBuildingId: "bld-1",
      }),
    ).toBe(false);
  });

  it("shows a shared unit file only for the resident's own unit", () => {
    expect(
      residentMayReadDocument({
        ...base,
        entityType: "ManagedUnit",
        visibility: "RESIDENT_SHARED",
        entityUnitId: "unit-2",
      }),
    ).toBe(false);
    expect(
      residentMayReadDocument({
        ...base,
        entityType: "ManagedUnit",
        visibility: "RESIDENT_SHARED",
        entityUnitId: "unit-1",
      }),
    ).toBe(true);
  });

  it("shows a shared assembly record to every resident of the building", () => {
    expect(
      residentMayReadDocument({
        ...base,
        entityType: "Assembly",
        visibility: "RESIDENT_SHARED",
        entityBuildingId: "bld-1",
      }),
    ).toBe(true);
  });

  it("shows a ticket file to the filer and to the unit, even when internal", () => {
    expect(
      residentMayReadDocument({
        ...base,
        entityType: "MaintenanceTicket",
        visibility: "INTERNAL",
        ticketReportedByPersonId: "someone-else",
        ticketUnitId: "unit-1",
      }),
    ).toBe(true);
    expect(
      residentMayReadDocument({
        ...base,
        entityType: "MaintenanceTicket",
        visibility: "INTERNAL",
        ticketReportedByPersonId: "person-1",
        ticketUnitId: "unit-9",
      }),
    ).toBe(true);
    expect(
      residentMayReadDocument({
        ...base,
        entityType: "MaintenanceTicket",
        visibility: "INTERNAL",
        ticketReportedByPersonId: "someone-else",
        ticketUnitId: "unit-9",
      }),
    ).toBe(false);
  });
});
