import { describe, expect, it } from "vitest";

import {
  deterministicModel97,
  formatModel97,
  generateModel97Reference,
  model97Check,
} from "./model97";

describe("model97Check", () => {
  it("computes the standard ISO 11649 / Serbian poziv-na-broj digits", () => {
    // 123456789012 mod 97 = 18 → check = 98 − 18 = 80
    expect(model97Check("123456789012")).toBe("80");
  });

  it("stays consistent for the all-9s edge case", () => {
    // 999999999999 mod 97 = 49 → check = 98 − 49 = 49
    expect(model97Check("999999999999")).toBe("49");
  });

  it("pads single-digit results to two digits", () => {
    // Pick a value where 98 − remainder < 10
    expect(model97Check("91")).toBe("07"); // 98 − 91 = 7
  });

  it("rejects non-numeric inputs", () => {
    expect(() => model97Check("abc")).toThrow();
    expect(() => model97Check("12 34")).toThrow();
  });
});

describe("formatModel97", () => {
  it("emits the canonical 97 CC-XXXXXXXXXXXX form", () => {
    expect(formatModel97("123456789012")).toBe("97 80-123456789012");
  });

  it("passes through anything that isn't exactly 12 digits", () => {
    expect(formatModel97("12345")).toBe("12345");
    expect(formatModel97("abc")).toBe("abc");
  });
});

describe("generateModel97Reference", () => {
  it("returns a 12-digit compact and valid model-97 string", () => {
    const ref = generateModel97Reference();
    expect(ref.compact).toMatch(/^\d{12}$/);
    expect(ref.model97).toMatch(/^97 \d{2}-\d{12}$/);
    // Verify check digit matches the compact value.
    const check = ref.model97.slice(3, 5);
    expect(check).toBe(model97Check(ref.compact));
  });
});

describe("deterministicModel97", () => {
  it("is stable for the same input", () => {
    const a = deterministicModel97("12345");
    const b = deterministicModel97("12345");
    expect(a.compact).toBe(b.compact);
    expect(a.model97).toBe(b.model97);
  });

  it("pads short keys to 12 digits", () => {
    expect(deterministicModel97(42).compact).toBe("000000000042");
  });

  it("takes the trailing 12 digits of long keys", () => {
    // 15 digits — keep the last 12
    const ref = deterministicModel97("123456789012345");
    expect(ref.compact).toBe("456789012345");
  });

  it("rejects inputs with no digits", () => {
    expect(() => deterministicModel97("abc")).toThrow();
  });
});
