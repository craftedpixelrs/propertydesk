import { describe, expect, it } from "vitest";

import { isContractFullyPaid, isSettlementStatus, summarizeSettlement } from "./settlement";

describe("summarizeSettlement", () => {
  it("matches the contracted price when there are no lines", () => {
    const result = summarizeSettlement({
      contracted: "120000.00",
      paid: "120000.00",
      lines: [],
    });
    expect(result.settled.toFixed(2)).toBe("120000.00");
    expect(result.difference.toFixed(2)).toBe("0.00");
  });

  it("subtracts a declined finish from the contracted price", () => {
    const result = summarizeSettlement({
      contracted: "120000",
      paid: "120000",
      lines: [{ kind: "DEDUCTION", amount: "2500.50" }],
    });
    expect(result.deductions.toFixed(2)).toBe("2500.50");
    expect(result.settled.toFixed(2)).toBe("117499.50");
    expect(result.difference.toFixed(2)).toBe("-2500.50");
  });

  it("adds a surcharge on top of the contracted price", () => {
    const result = summarizeSettlement({
      contracted: "120000",
      paid: "120000",
      lines: [{ kind: "SURCHARGE", amount: "8000" }],
    });
    expect(result.surcharges.toFixed(2)).toBe("8000.00");
    expect(result.settled.toFixed(2)).toBe("128000.00");
    expect(result.difference.toFixed(2)).toBe("8000.00");
  });

  it("nets a deduction and a surcharge against what was already paid", () => {
    const result = summarizeSettlement({
      contracted: "100000",
      paid: "100000",
      lines: [
        { kind: "DEDUCTION", amount: "3000" },
        { kind: "SURCHARGE", amount: "1500" },
      ],
    });
    expect(result.settled.toFixed(2)).toBe("98500.00");
    expect(result.difference.toFixed(2)).toBe("-1500.00");
  });
});

describe("settlement eligibility", () => {
  it("opens for a paid or handed-over sale once the contract is covered", () => {
    expect(isSettlementStatus("PAID")).toBe(true);
    expect(isSettlementStatus("HANDED_OVER")).toBe(true);
    expect(isSettlementStatus("PAYMENT_IN_PROGRESS")).toBe(false);
    expect(isContractFullyPaid("90000", "90000")).toBe(true);
    expect(isContractFullyPaid("90000", "89999.99")).toBe(false);
  });
});
