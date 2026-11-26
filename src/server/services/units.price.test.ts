import Decimal from "decimal.js";
import { describe, expect, it } from "vitest";

import { totalFromPricePerSquareMeter } from "./unit-price";

describe("totalFromPricePerSquareMeter", () => {
  it("sets the unit total to area times the price per square meter", () => {
    const total = totalFromPricePerSquareMeter(new Decimal("2600"), new Decimal("100.65"));
    expect(total.toFixed(2)).toBe("261690.00");
  });
});
