/**
 * Who on the resident portal may open a document. Kept free of the
 * database so the list and the download guard stay the same rule.
 *
 * Ticket files are readable to the person who filed the ticket and to
 * anyone with access to that unit, even when the file is internal
 * (it is their own report). Everything else must be marked visible to
 * residents and must belong to one of their buildings or units.
 */
export function residentMayReadDocument(input: {
  entityType: string;
  visibility: string;
  personId: string;
  buildingIds: string[];
  unitIds: string[];
  /** Set when the file hangs off a building or an assembly in that building. */
  entityBuildingId?: string | null;
  entityUnitId?: string | null;
  ticketReportedByPersonId?: string | null;
  ticketUnitId?: string | null;
}): boolean {
  if (input.entityType === "ManagedBuilding") {
    return (
      input.visibility === "RESIDENT_SHARED" &&
      !!input.entityBuildingId &&
      input.buildingIds.includes(input.entityBuildingId)
    );
  }
  if (input.entityType === "ManagedUnit") {
    return (
      input.visibility === "RESIDENT_SHARED" &&
      !!input.entityUnitId &&
      input.unitIds.includes(input.entityUnitId)
    );
  }
  if (input.entityType === "Assembly") {
    return (
      input.visibility === "RESIDENT_SHARED" &&
      !!input.entityBuildingId &&
      input.buildingIds.includes(input.entityBuildingId)
    );
  }
  if (input.entityType === "MaintenanceTicket") {
    if (input.ticketReportedByPersonId && input.ticketReportedByPersonId === input.personId) {
      return true;
    }
    return !!input.ticketUnitId && input.unitIds.includes(input.ticketUnitId);
  }
  return false;
}
