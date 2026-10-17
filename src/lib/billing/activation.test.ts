import { describe, expect, it } from "vitest";
import {
  belgradeDateString,
  belgradeStartOfDay,
  isBeforeActivation,
} from "@/lib/billing/activation";
import { addDays } from "@/server/services/subscriptions/trial-days";

describe("activation date", () => {
  it("starts a winter day at Belgrade midnight (CET)", () => {
    const start = belgradeStartOfDay("2026-01-15");
    expect(start?.toISOString()).toBe("2026-01-14T23:00:00.000Z");
    expect(start ? belgradeDateString(start) : null).toBe("2026-01-15");
  });

  it("starts a summer day at Belgrade midnight (CEST)", () => {
    const start = belgradeStartOfDay("2026-10-15");
    expect(start?.toISOString()).toBe("2026-10-14T22:00:00.000Z");
  });

  it("rejects a calendar day that does not exist", () => {
    expect(belgradeStartOfDay("2026-02-31")).toBeNull();
    expect(belgradeStartOfDay("15.10.2026")).toBeNull();
  });

  it("keeps the account off until the instant, then counts trial days from it", () => {
    const start = belgradeStartOfDay("2026-10-15");
    expect(start).not.toBeNull();
    const justBefore = new Date(start!.getTime() - 1);
    expect(isBeforeActivation(start, justBefore)).toBe(true);
    expect(isBeforeActivation(start, start!)).toBe(false);
    expect(isBeforeActivation(null, start!)).toBe(false);
    expect(addDays(start!, 30).toISOString()).toBe("2026-11-13T22:00:00.000Z");
  });
});
