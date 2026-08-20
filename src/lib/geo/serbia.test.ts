import { describe, expect, it } from "vitest";

import {
  findSerbiaCity,
  postalCodeForMunicipality,
  suggestSerbiaPlaces,
} from "./serbia";

describe("suggestSerbiaPlaces", () => {
  it("suggests cities as the user types", () => {
    const hits = suggestSerbiaPlaces("city", "zem");
    expect(hits.some((place) => place.name === "Zemun")).toBe(true);
  });

  it("limits municipalities to the selected city", () => {
    const hits = suggestSerbiaPlaces("municipality", "nov", "Beograd");
    expect(hits.every((place) => place.city === "Beograd")).toBe(true);
    expect(hits.some((place) => place.name === "Novi Beograd")).toBe(true);
  });
});

describe("postal and city lookup", () => {
  it("returns the municipality postal code", () => {
    expect(postalCodeForMunicipality("Zemun", "Beograd")).toBe("11080");
  });

  it("finds a city centroid", () => {
    const city = findSerbiaCity("Novi Sad");
    expect(city?.lat).toBeCloseTo(45.2671, 3);
  });
});
