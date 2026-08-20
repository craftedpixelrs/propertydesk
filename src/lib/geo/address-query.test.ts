import { describe, expect, it } from "vitest";

import {
  cityNameMatches,
  formatStreetAddress,
  preferTypedStreetLabel,
  splitStreetAndNumber,
} from "./address-query";

describe("splitStreetAndNumber", () => {
  it("keeps Serbian street-then-number order", () => {
    expect(splitStreetAndNumber("Milisava Dakića 18")).toEqual({
      street: "Milisava Dakića",
      house: "18",
    });
  });

  it("accepts English number-first order", () => {
    expect(splitStreetAndNumber("18 Milisava Dakića")).toEqual({
      street: "Milisava Dakića",
      house: "18",
    });
  });

  it("leaves a street without a number intact", () => {
    expect(splitStreetAndNumber("Milisava Dakića")).toEqual({
      street: "Milisava Dakića",
      house: null,
    });
  });
});

describe("cityNameMatches", () => {
  it("matches Ruma against Photon municipality labels", () => {
    expect(
      cityNameMatches("Ruma", ["Ruma Municipality", "Kudoš", "Ruma"]),
    ).toBe(true);
    expect(cityNameMatches("Ruma", ["Општина Рума", "Рума"])).toBe(true);
  });

  it("rejects a street from another city", () => {
    expect(
      cityNameMatches("Ruma", ["Cukarica Urban Municipality", "Čukarica"]),
    ).toBe(false);
  });
});

describe("street labels", () => {
  it("keeps the Latin query when OSM only has Cyrillic", () => {
    expect(preferTypedStreetLabel("Милисава Дакића", "Milisava Dakića")).toBe(
      "Milisava Dakića",
    );
  });

  it("appends the house number after the street", () => {
    expect(formatStreetAddress("Milisava Dakića", "18")).toBe(
      "Milisava Dakića 18",
    );
  });
});
