import { describe, expect, it } from "vitest";

import { buildingPath, type BuildingPulse } from "./building-pulse";

const empty: BuildingPulse = {
  units: 0,
  unitsWithoutOwner: 0,
  persons: 0,
  portalInvites: 0,
  tariffs: 0,
  openCharges: 0,
  openTickets: 0,
  liveAssemblies: 0,
  notices: 0,
};

describe("buildingPath", () => {
  it("marks units and money as the next gap when the building is empty", () => {
    const path = buildingPath(empty);
    expect(path.units).toBe("next");
    expect(path.residents).toBe("ok");
    expect(path.money).toBe("next");
    expect(path.community).toBe("ok");
  });

  it("asks for a portal link once people exist but nobody was invited", () => {
    const path = buildingPath({ ...empty, units: 3, persons: 2, tariffs: 1 });
    expect(path.units).toBe("ok");
    expect(path.residents).toBe("next");
    expect(path.money).toBe("ok");
  });

  it("keeps money and community open while charges, tickets or an assembly are live", () => {
    const path = buildingPath({
      ...empty,
      units: 4,
      persons: 4,
      portalInvites: 2,
      tariffs: 2,
      openCharges: 3,
      openTickets: 1,
      liveAssemblies: 1,
      notices: 2,
    });
    expect(path.residents).toBe("ok");
    expect(path.money).toBe("open");
    expect(path.community).toBe("open");
  });
});
