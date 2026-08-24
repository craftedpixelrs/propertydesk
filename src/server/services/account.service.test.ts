import { describe, expect, it } from "vitest";

import { normalizeDisplayName } from "./account-name";

describe("normalizeDisplayName", () => {
  it("trims and collapses spaces", () => {
    expect(normalizeDisplayName("  Ana   Petrović  ")).toBe("Ana Petrović");
  });
});
