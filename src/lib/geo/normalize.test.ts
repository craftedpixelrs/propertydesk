import { describe, expect, it } from "vitest";

import { normalizeGeoQuery } from "./normalize";

describe("normalizeGeoQuery", () => {
  it("treats Latin and Cyrillic Ruma as the same city", () => {
    expect(normalizeGeoQuery("Ruma")).toBe("ruma");
    expect(normalizeGeoQuery("Рума")).toBe("ruma");
    expect(normalizeGeoQuery("Општина Рума")).toBe("opstinaruma");
  });
});
