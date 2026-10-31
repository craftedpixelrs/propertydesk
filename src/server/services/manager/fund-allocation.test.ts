import Decimal from "decimal.js";
import { describe, expect, it } from "vitest";

import { allocateCashToBreakdown, kindsToFunds } from "./fund-allocation";

describe("allocateCashToBreakdown", () => {
  it("splits a full payment in proportion to the tariff breakdown", () => {
    const out = allocateCashToBreakdown(new Decimal("100.00"), {
      CURRENT_MAINTENANCE: "70.00",
      INVESTMENT_FUND: "30.00",
    });
    expect(out.CURRENT_MAINTENANCE.toFixed(2)).toBe("70.00");
    expect(out.INVESTMENT_FUND.toFixed(2)).toBe("30.00");
    expect(out.OTHER.toFixed(2)).toBe("0.00");
  });

  it("scales a partial payment and keeps the cent remainder on the last part", () => {
    const out = allocateCashToBreakdown(new Decimal("100.00"), {
      CURRENT_MAINTENANCE: "1",
      INVESTMENT_FUND: "1",
      OTHER: "1",
    });
    const sum = out.CURRENT_MAINTENANCE.plus(out.INVESTMENT_FUND).plus(out.OTHER);
    expect(sum.toFixed(2)).toBe("100.00");
    expect(out.CURRENT_MAINTENANCE.toFixed(2)).toBe("33.33");
    expect(out.INVESTMENT_FUND.toFixed(2)).toBe("33.33");
    expect(out.OTHER.toFixed(2)).toBe("33.34");
  });

  it("books cash with no breakdown as current maintenance", () => {
    const out = allocateCashToBreakdown(new Decimal("40.00"), {});
    expect(out.CURRENT_MAINTENANCE.toFixed(2)).toBe("40.00");
  });

  it("ignores a zero or negative cash amount", () => {
    const out = allocateCashToBreakdown(new Decimal("0"), {
      CURRENT_MAINTENANCE: "10",
    });
    expect(out.CURRENT_MAINTENANCE.toFixed(2)).toBe("0.00");
  });
});

describe("kindsToFunds", () => {
  it("rolls manager fee and insurance into the other fund", () => {
    const allocated = allocateCashToBreakdown(new Decimal("100.00"), {
      CURRENT_MAINTENANCE: "40",
      INVESTMENT_FUND: "25",
      MANAGER_FEE: "20",
      INSURANCE: "10",
      OTHER: "5",
    });
    const funds = kindsToFunds(allocated);
    expect(funds.CURRENT_MAINTENANCE.toFixed(2)).toBe("40.00");
    expect(funds.INVESTMENT_FUND.toFixed(2)).toBe("25.00");
    expect(funds.OTHER.toFixed(2)).toBe("35.00");
  });
});
