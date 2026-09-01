import { describe, expect, it } from "vitest";

import {
  parseTheme,
  themeFromCookieString,
  themeFromRequest,
  writeThemeCookieValue,
} from "./index";

describe("parseTheme()", () => {
  it("accepts supported theme values", () => {
    expect(parseTheme("light")).toBe("light");
    expect(parseTheme("dark")).toBe("dark");
    expect(parseTheme("DARK")).toBe("dark");
  });

  it("rejects unknown values", () => {
    expect(parseTheme(null)).toBeNull();
    expect(parseTheme("")).toBeNull();
    expect(parseTheme("system")).toBeNull();
    expect(parseTheme("auto")).toBeNull();
  });
});

describe("themeFromCookieString()", () => {
  it("reads pd_theme from a cookie header", () => {
    expect(themeFromCookieString("pd_theme=dark; Path=/")).toBe("dark");
    expect(themeFromCookieString("other=1; pd_theme=light")).toBe("light");
    expect(themeFromCookieString("session=abc")).toBeNull();
  });
});

describe("writeThemeCookieValue()", () => {
  it("writes a Lax cookie for the theme", () => {
    expect(writeThemeCookieValue("dark")).toContain("pd_theme=dark");
    expect(writeThemeCookieValue("dark")).toContain("SameSite=Lax");
  });
});

describe("themeFromRequest()", () => {
  function req(headers: Record<string, string>, cookie?: string) {
    return {
      headers: { get: (name: string) => headers[name.toLowerCase()] ?? null },
      cookies: {
        get: (name: string) =>
          name === "pd_theme" && cookie ? { value: cookie } : undefined,
      },
    };
  }

  it("prefers x-pd-theme over cookie", () => {
    expect(themeFromRequest(req({ "x-pd-theme": "dark" }, "light"))).toBe(
      "dark",
    );
  });

  it("falls back to cookie then light", () => {
    expect(themeFromRequest(req({}, "dark"))).toBe("dark");
    expect(themeFromRequest(req({}))).toBe("light");
  });
});
