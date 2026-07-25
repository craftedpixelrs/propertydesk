import { describe, expect, it } from "vitest";
import { resolveDefaultBillingSettings } from "./resolved.service";

describe("resolveDefaultBillingSettings", () => {
  it("returns billing enabled with sensible defaults", () => {
    const s = resolveDefaultBillingSettings();
    expect(s.billingEnabled).toBe(true);
    expect(s.currency).toBeTypeOf("string");
    expect(s.defaultTrialDays).toBeGreaterThan(0);
    expect(s.restrictedAfterDays).toBeGreaterThan(0);
    expect(s.suspendedAfterDays).toBeGreaterThan(s.restrictedAfterDays);
  });

  it("provides a reminder schedule sorted by offsetDays", () => {
    const s = resolveDefaultBillingSettings();
    expect(s.reminderSchedule.length).toBeGreaterThan(0);
    for (let i = 1; i < s.reminderSchedule.length; i++) {
      expect(s.reminderSchedule[i]!.offsetDays).toBeGreaterThanOrEqual(
        s.reminderSchedule[i - 1]!.offsetDays,
      );
    }
  });

  it("exposes all automation flags as booleans", () => {
    const s = resolveDefaultBillingSettings();
    for (const key of [
      "generateInvoices",
      "sendInvoices",
      "reminders",
      "overdue",
      "extendSubscriptions",
      "restrictAccess",
      "suspend",
    ] as const) {
      expect(typeof s.automation[key]).toBe("boolean");
    }
  });

  it("caps allowlist to a small set of read-only permissions in RESTRICTED mode", () => {
    const s = resolveDefaultBillingSettings();
    expect(s.restrictedModeAllowedPermissions.length).toBeGreaterThan(0);
    for (const perm of s.restrictedModeAllowedPermissions) {
      expect(perm).toMatch(/^(billing|organization|user|report|document)\.[\w:.]+$/);
    }
  });
});
