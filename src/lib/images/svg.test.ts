import { describe, expect, it } from "vitest";

import { isSvgFile, sanitizeSvg } from "./svg";

describe("isSvgFile", () => {
  it("accepts svg mime and .svg names", () => {
    expect(isSvgFile("logo.svg", "")).toBe(true);
    expect(isSvgFile("logo.png", "image/svg+xml")).toBe(true);
    expect(isSvgFile("logo.png", "image/png")).toBe(false);
  });
});

describe("sanitizeSvg", () => {
  it("strips scripts and event handlers", () => {
    const raw = Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script><g onclick="alert(1)"><circle/></g></svg>`,
    );
    const out = sanitizeSvg(raw).toString("utf8");
    expect(out).toContain("<svg");
    expect(out).not.toContain("<script");
    expect(out).not.toContain("onclick");
  });

  it("rejects non-svg bytes", () => {
    expect(() => sanitizeSvg(Buffer.from("not a logo"))).toThrow("invalid-svg");
  });
});
