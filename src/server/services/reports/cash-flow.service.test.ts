import { describe, expect, it } from "vitest";

import { resolveCashFlowWindow } from "./cash-flow.service";

describe("resolveCashFlowWindow", () => {
  it("uses daily buckets for a short selected period", () => {
    const window = resolveCashFlowWindow({
      from: new Date(2026, 7, 17, 0, 0, 0, 0),
      to: new Date(2026, 7, 19, 23, 59, 59, 999),
    });
    expect(window.bounded).toBe(true);
    expect(window.grain).toBe("day");
    expect(window.from.getDate()).toBe(17);
    expect(window.to.getDate()).toBe(19);
  });

  it("uses monthly buckets for a long selected period", () => {
    const window = resolveCashFlowWindow({
      from: new Date(2026, 0, 1),
      to: new Date(2026, 11, 31, 23, 59, 59, 999),
    });
    expect(window.grain).toBe("month");
    expect(window.monthsAhead).toBe(12);
  });

  it("falls back to a rolling 12-month window without dates", () => {
    const window = resolveCashFlowWindow({ months: 12 });
    expect(window.bounded).toBe(false);
    expect(window.grain).toBe("month");
    expect(window.monthsAhead).toBe(12);
  });
});
