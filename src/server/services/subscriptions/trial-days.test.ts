import { describe, expect, it } from "vitest";
import { addDays, originalTrialDays, remainingTrialDays } from "./trial-days";

describe("remainingTrialDays", () => {
  const now = new Date("2026-08-17T10:00:00.000Z");

  it("returns null when no trial end is stored", () => {
    expect(remainingTrialDays(null, now)).toBeNull();
    expect(remainingTrialDays(undefined, now)).toBeNull();
  });

  it("returns 0 when the trial has already ended", () => {
    expect(remainingTrialDays(new Date("2026-08-15T10:00:00.000Z"), now)).toBe(0);
  });

  it("returns remaining whole days while the trial is active", () => {
    expect(remainingTrialDays(new Date("2026-08-24T10:00:00.000Z"), now)).toBe(7);
  });
});

describe("originalTrialDays", () => {
  it("returns the configured length from start to end", () => {
    expect(
      originalTrialDays(
        new Date("2026-07-16T10:00:00.000Z"),
        new Date("2026-08-15T10:00:00.000Z"),
      ),
    ).toBe(30);
  });

  it("returns null when either bound is missing", () => {
    expect(originalTrialDays(null, new Date())).toBeNull();
  });
});

describe("addDays", () => {
  it("adds calendar days in UTC milliseconds", () => {
    const from = new Date("2026-08-17T10:00:00.000Z");
    expect(addDays(from, 14).toISOString()).toBe("2026-08-31T10:00:00.000Z");
  });
});
