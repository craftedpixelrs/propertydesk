/**
 * How far one building has gone along the manager path:
 * units → residents and portal → tariffs and open charges → tickets,
 * notices and assemblies. Pure so the overview and tests share one reading.
 */
export interface BuildingPulse {
  units: number;
  unitsWithoutOwner: number;
  persons: number;
  portalInvites: number;
  tariffs: number;
  openCharges: number;
  openTickets: number;
  liveAssemblies: number;
  notices: number;
}

export type PathTone = "next" | "open" | "ok";

export interface BuildingPath {
  units: PathTone;
  residents: PathTone;
  money: PathTone;
  community: PathTone;
}

export function buildingPath(pulse: BuildingPulse): BuildingPath {
  return {
    units: pulse.units === 0 ? "next" : "ok",
    residents:
      pulse.units > 0 && (pulse.persons === 0 || pulse.portalInvites === 0) ? "next" : "ok",
    money: pulse.tariffs === 0 ? "next" : pulse.openCharges > 0 ? "open" : "ok",
    community: pulse.openTickets > 0 || pulse.liveAssemblies > 0 ? "open" : "ok",
  };
}
