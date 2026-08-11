import { Prisma } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { computeSaleTax, saleTaxPayerLabel, saleVatModeLabel } from "./tax.service";

describe("computeSaleTax", () => {
  it("returns null when vatMode missing", () => {
    const result = computeSaleTax({ finalPrice: 100000, vatMode: null });
    expect(result.taxAmount).toBeNull();
    expect(result.rate).toBeNull();
  });

  it("returns null taxAmount when finalPrice missing but keeps rate", () => {
    const result = computeSaleTax({ finalPrice: null, vatMode: "NEW_BUILD_10" });
    expect(result.taxAmount).toBeNull();
    expect(result.rate).not.toBeNull();
  });

  it("computes 10% VAT for NEW_BUILD_10", () => {
    const result = computeSaleTax({ finalPrice: "150000.00", vatMode: "NEW_BUILD_10" });
    expect(result.taxAmount?.toString()).toBe("15000");
  });

  it("computes 2.5% PPAP for SECONDARY_MARKET_2_5", () => {
    const result = computeSaleTax({
      finalPrice: new Prisma.Decimal("80000.00"),
      vatMode: "SECONDARY_MARKET_2_5",
    });
    expect(result.taxAmount?.toString()).toBe("2000");
  });

  it("returns 0 for NONE mode", () => {
    const result = computeSaleTax({ finalPrice: 100000, vatMode: "NONE" });
    expect(result.taxAmount?.toString()).toBe("0");
  });

  it("rounds half-up to 2 decimals", () => {
    // 12345.67 * 0.10 = 1234.567 -> 1234.57
    const result = computeSaleTax({ finalPrice: "12345.67", vatMode: "NEW_BUILD_10" });
    expect(result.taxAmount?.toString()).toBe("1234.57");
  });

  it("handles invalid finalPrice gracefully", () => {
    const result = computeSaleTax({ finalPrice: "not-a-number", vatMode: "NEW_BUILD_10" });
    expect(result.taxAmount).toBeNull();
  });
});

describe("saleVatModeLabel", () => {
  it("returns Serbian label for each mode", () => {
    expect(saleVatModeLabel("NEW_BUILD_10")).toContain("10%");
    expect(saleVatModeLabel("SECONDARY_MARKET_2_5")).toContain("2.5%");
    expect(saleVatModeLabel("NONE")).toBe("Bez poreza");
    expect(saleVatModeLabel(null)).toBe("Nije određeno");
  });
});

describe("saleTaxPayerLabel", () => {
  it("returns label for each payer", () => {
    expect(saleTaxPayerLabel("BUYER")).toBe("Kupac");
    expect(saleTaxPayerLabel("SELLER")).toBe("Prodavac");
    expect(saleTaxPayerLabel(null)).toBe("—");
  });
});
