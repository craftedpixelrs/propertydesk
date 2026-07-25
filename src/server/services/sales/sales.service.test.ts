import { describe, expect, it } from "vitest";
import { computeFinalPrice } from "./sales.service";

/**
 * Pure discount math — must never leak IEEE-754 rounding into money.
 * Anything that touches `.finalPrice` on the Sale row goes through this
 * function, so a regression here would silently corrupt every future sale.
 */
describe("computeFinalPrice", () => {
  it("returns the list price when no discount is set", () => {
    expect(computeFinalPrice("100000.00", null, null).toString()).toBe("100000");
  });

  it("applies a percentage discount with two-decimal rounding", () => {
    expect(computeFinalPrice("100000.00", "PERCENTAGE", "10").toString()).toBe("90000");
    expect(computeFinalPrice("99999.99", "PERCENTAGE", "12.5").toString()).toBe("87499.99");
  });

  it("applies a fixed-amount discount", () => {
    expect(computeFinalPrice("120000", "FIXED", "5000").toString()).toBe("115000");
  });

  it("rejects a percentage discount outside 0-100", () => {
    expect(() => computeFinalPrice("100", "PERCENTAGE", "150")).toThrow(
      /procentima mora biti/i,
    );
    expect(() => computeFinalPrice("100", "PERCENTAGE", "-1")).toThrow(
      /procentima mora biti/i,
    );
  });

  it("rejects a fixed discount that would drive the final price below zero", () => {
    expect(() => computeFinalPrice("100", "FIXED", "200")).toThrow(/veći od cene/i);
  });

  it("rejects a negative fixed discount", () => {
    expect(() => computeFinalPrice("100", "FIXED", "-1")).toThrow(/negativan/i);
  });

  it("returns a Decimal-typed result even when inputs are strings", () => {
    const result = computeFinalPrice("1.1", "FIXED", "0.1");
    // Two-decimal precision keeps 1.10 - 0.10 == 1.00 (no 1.0000000000...0002 float drift)
    expect(result.toString()).toBe("1");
  });
});
