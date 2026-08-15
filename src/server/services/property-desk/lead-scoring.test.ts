import { describe, expect, it } from "vitest";

import { computeLeadScore } from "./lead-scoring";

describe("computeLeadScore", () => {
  it("returns 0 for empty input", () => {
    expect(computeLeadScore({})).toBe(0);
  });

  it("adds 10 for full company info (name + website)", () => {
    expect(
      computeLeadScore({
        companyName: "Acme",
        companyWebsite: "https://acme.rs",
      }),
    ).toBe(10);
  });

  it("does not add company points if only one of name/website is present", () => {
    expect(computeLeadScore({ companyName: "Acme" })).toBe(0);
    expect(
      computeLeadScore({ companyWebsite: "https://acme.rs" }),
    ).toBe(0);
  });

  it("company size steps are 10 (>=10) and 20 (>=50), not additive", () => {
    expect(computeLeadScore({ companySize: 9 })).toBe(0);
    expect(computeLeadScore({ companySize: 10 })).toBe(10);
    expect(computeLeadScore({ companySize: 49 })).toBe(10);
    expect(computeLeadScore({ companySize: 50 })).toBe(20);
    expect(computeLeadScore({ companySize: 1000 })).toBe(20);
  });

  it("budgetTier maps to 5 / 15 / 25 (UNKNOWN = 0)", () => {
    expect(computeLeadScore({ budgetTier: "STARTER" })).toBe(5);
    expect(computeLeadScore({ budgetTier: "GROWTH" })).toBe(15);
    expect(computeLeadScore({ budgetTier: "ENTERPRISE" })).toBe(25);
    expect(computeLeadScore({ budgetTier: "UNKNOWN" })).toBe(0);
  });

  it("timelineHorizon maps to 25 / 15 / 5 (UNDECIDED = 0)", () => {
    expect(computeLeadScore({ timelineHorizon: "WITHIN_30D" })).toBe(25);
    expect(computeLeadScore({ timelineHorizon: "WITHIN_90D" })).toBe(15);
    expect(computeLeadScore({ timelineHorizon: "LATER" })).toBe(5);
    expect(computeLeadScore({ timelineHorizon: "UNDECIDED" })).toBe(0);
  });

  it("adds 10 only when both decision maker fields are set", () => {
    expect(
      computeLeadScore({
        decisionMakerName: "Petar",
        decisionMakerTitle: "CEO",
      }),
    ).toBe(10);
    expect(computeLeadScore({ decisionMakerName: "Petar" })).toBe(0);
    expect(computeLeadScore({ decisionMakerTitle: "CEO" })).toBe(0);
  });

  it("temperature adds HOT +15, WARM +8, COLD 0", () => {
    expect(computeLeadScore({ temperature: "HOT" })).toBe(15);
    expect(computeLeadScore({ temperature: "WARM" })).toBe(8);
    expect(computeLeadScore({ temperature: "COLD" })).toBe(0);
  });

  it("stage adds pipeline points (DEMO 25, PROPOSAL 35, LOST 0)", () => {
    expect(computeLeadScore({ stage: "NEW" })).toBe(0);
    expect(computeLeadScore({ stage: "CONTACTED" })).toBe(8);
    expect(computeLeadScore({ stage: "QUALIFIED" })).toBe(15);
    expect(computeLeadScore({ stage: "NURTURING" })).toBe(5);
    expect(computeLeadScore({ stage: "DEMO" })).toBe(25);
    expect(computeLeadScore({ stage: "PROPOSAL" })).toBe(35);
    expect(computeLeadScore({ stage: "WON" })).toBe(45);
    expect(computeLeadScore({ stage: "LOST" })).toBe(0);
  });

  it("stage and qualification stack (DEMO + WARM = 33)", () => {
    expect(computeLeadScore({ stage: "DEMO", temperature: "WARM" })).toBe(33);
  });

  it("all points combined caps at 100", () => {
    const maxed = computeLeadScore({
      companyName: "Acme",
      companyWebsite: "https://acme.rs",
      companySize: 1000,
      budgetTier: "ENTERPRISE",
      timelineHorizon: "WITHIN_30D",
      decisionMakerName: "Petar",
      decisionMakerTitle: "CEO",
      temperature: "HOT",
    });
    expect(maxed).toBe(100);
  });

  it("is deterministic — same input always returns same score", () => {
    const input = {
      companyName: "Acme",
      companyWebsite: "https://acme.rs",
      companySize: 22,
      budgetTier: "GROWTH" as const,
      timelineHorizon: "WITHIN_90D" as const,
      decisionMakerName: "Petar",
      decisionMakerTitle: "CTO",
      temperature: "WARM" as const,
    };
    // 10 + 10 + 15 + 15 + 10 + 8 = 68
    const results = Array.from({ length: 5 }, () => computeLeadScore(input));
    expect(new Set(results).size).toBe(1);
    expect(results[0]).toBe(68);
  });

  it("clamps negative-looking edge cases to 0", () => {
    expect(computeLeadScore({ companySize: -100 })).toBe(0);
  });
});
