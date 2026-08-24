import { describe, expect, it } from "vitest";

import {
  filterCatalogUnits,
  paginateCatalog,
  PUBLIC_CATALOG_PAGE_SIZE,
} from "./catalog-filters";

const units = [
  {
    code: "A1-01",
    type: "APARTMENT",
    structure: "2.0",
    totalArea: "60.5",
    bedrooms: 2,
    bathrooms: 1,
    orientation: "Zapad",
    price: "133100",
  },
  {
    code: "A1-02",
    type: "APARTMENT",
    structure: "3.0",
    totalArea: "88",
    bedrooms: 3,
    bathrooms: 2,
    orientation: "Istok",
    price: "190000",
  },
  {
    code: "G-01",
    type: "GARAGE",
    structure: null,
    totalArea: "14",
    bedrooms: null,
    bathrooms: null,
    orientation: null,
    price: "15000",
  },
];

const blank = {
  q: "",
  type: "",
  bedrooms: "",
  bathrooms: "",
  orientation: "",
  areaMin: "",
  areaMax: "",
  priceMin: "",
  priceMax: "",
};

describe("filterCatalogUnits", () => {
  it("filters by bedrooms, orientation and price", () => {
    const out = filterCatalogUnits(units, {
      ...blank,
      bedrooms: "2",
      orientation: "Zapad",
      priceMax: "150000",
    });
    expect(out.map((u) => u.code)).toEqual(["A1-01"]);
  });

  it("treats 4+ as four or more bedrooms", () => {
    const out = filterCatalogUnits(
      [...units, { ...units[0], code: "P", bedrooms: 5 }],
      { ...blank, bedrooms: "4+" },
    );
    expect(out.map((u) => u.code)).toEqual(["P"]);
  });
});

describe("paginateCatalog", () => {
  it("uses 15 items per page", () => {
    const many = Array.from({ length: 16 }, (_, i) => ({ id: i }));
    const first = paginateCatalog(many, 1);
    expect(first.items).toHaveLength(PUBLIC_CATALOG_PAGE_SIZE);
    expect(first.totalPages).toBe(2);
    expect(paginateCatalog(many, 2).items).toHaveLength(1);
  });
});
