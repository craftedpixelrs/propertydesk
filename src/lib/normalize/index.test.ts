import { describe, expect, it } from "vitest";

import { normalizeEmail, normalizePhone } from "./index";

describe("normalizePhone", () => {
  it("collapses Serbian national and international forms", () => {
    const national = normalizePhone("060/123-45-67");
    const intl = normalizePhone("+381 60 1234567");
    expect(national).toBe("+381601234567");
    expect(national).toBe(intl);
  });

  it("handles the 00 international access code", () => {
    expect(normalizePhone("0038160123456")).toBe("+38160123456");
  });

  it("returns null for empty input", () => {
    expect(normalizePhone("")).toBeNull();
    expect(normalizePhone(null)).toBeNull();
    expect(normalizePhone(undefined)).toBeNull();
  });

  it("keeps an explicit foreign country code", () => {
    expect(normalizePhone("+49 170 1234567")).toBe("+491701234567");
  });
});

describe("normalizeEmail", () => {
  it("trims and lowercases", () => {
    expect(normalizeEmail("  John@Example.COM ")).toBe("john@example.com");
  });

  it("returns null for empty input", () => {
    expect(normalizeEmail("")).toBeNull();
    expect(normalizeEmail(null)).toBeNull();
  });
});
