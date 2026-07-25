import { describe, expect, it, vi } from "vitest";

vi.mock("@/server/db/prisma", () => ({ prisma: {} }));
vi.mock("@/server/audit/audit", () => ({ recordAudit: vi.fn() }));

import { addCycle, priceForCycle, CYCLE_MONTHS } from "./subscriptions.service";

describe("addCycle", () => {
  const base = new Date(Date.UTC(2026, 0, 15, 12, 0, 0));

  it("moves 1 month forward for MONTHLY", () => {
    const next = addCycle(base, "MONTHLY");
    expect(next.getUTCFullYear()).toBe(2026);
    expect(next.getUTCMonth()).toBe(1);
    expect(next.getUTCDate()).toBe(15);
  });

  it("moves 3 months forward for QUARTERLY", () => {
    const next = addCycle(base, "QUARTERLY");
    expect(next.getUTCMonth()).toBe(3);
  });

  it("moves 6 months forward for SEMI_ANNUAL", () => {
    const next = addCycle(base, "SEMI_ANNUAL");
    expect(next.getUTCMonth()).toBe(6);
  });

  it("moves 12 months forward for ANNUAL", () => {
    const next = addCycle(base, "ANNUAL");
    expect(next.getUTCFullYear()).toBe(2027);
    expect(next.getUTCMonth()).toBe(0);
  });

  it("CYCLE_MONTHS is monotonic", () => {
    expect(CYCLE_MONTHS.MONTHLY).toBeLessThan(CYCLE_MONTHS.QUARTERLY);
    expect(CYCLE_MONTHS.QUARTERLY).toBeLessThan(CYCLE_MONTHS.SEMI_ANNUAL);
    expect(CYCLE_MONTHS.SEMI_ANNUAL).toBeLessThan(CYCLE_MONTHS.ANNUAL);
  });
});

describe("priceForCycle", () => {
  const plan = {
    monthlyPrice: "10",
    quarterlyPrice: "28",
    semiAnnualPrice: "54",
    annualPrice: "100",
  };

  it("returns the explicit cycle price when defined", () => {
    expect(priceForCycle(plan, "MONTHLY").toString()).toBe("10");
    expect(priceForCycle(plan, "QUARTERLY").toString()).toBe("28");
    expect(priceForCycle(plan, "SEMI_ANNUAL").toString()).toBe("54");
    expect(priceForCycle(plan, "ANNUAL").toString()).toBe("100");
  });

  it("falls back to N × monthly when a cycle price is null", () => {
    const partial = { monthlyPrice: "10", quarterlyPrice: null, semiAnnualPrice: null, annualPrice: null };
    expect(priceForCycle(partial, "QUARTERLY").toString()).toBe("30");
    expect(priceForCycle(partial, "SEMI_ANNUAL").toString()).toBe("60");
    expect(priceForCycle(partial, "ANNUAL").toString()).toBe("120");
  });

  it("CUSTOM billing cycle falls back to monthly price", () => {
    expect(priceForCycle(plan, "CUSTOM").toString()).toBe("10");
  });
});
