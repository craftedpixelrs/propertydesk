import { describe, expect, it, vi } from "vitest";
import { localeFromCookieString, localeFromRequest, parseLocale, t } from "./index";

describe("t()", () => {
  it("returns a Serbian Latin string for known keys", () => {
    expect(t("nav.dashboard")).toBe("Kontrolna tabla");
    expect(t("nav.projects")).toBe("Projekti");
    expect(t("nav.reservations")).toBe("Rezervacije");
    expect(t("common.save")).toBe("Sačuvaj");
    expect(t("guides.chrome.open")).toBe("Kako se koristi");
  });

  it("returns English when locale is en", () => {
    expect(t("nav.dashboard", undefined, "en")).toBe("Dashboard");
    expect(t("nav.projects", undefined, "en")).toBe("Projects");
    expect(t("common.save", undefined, "en")).toBe("Save");
    expect(t("language.label", undefined, "en")).toBe("Language");
    expect(t("guides.chrome.open", undefined, "en")).toBe("How this page works");
  });

  it("uses Serbian diacritics correctly", () => {
    expect(t("nav.signOut")).toBe("Odjavi se");
    expect(t("nav.paymentPlans")).toBe("Planovi plaćanja");
    expect(t("common.comingSoon")).toBe("Uskoro");
  });

  it("covers billing lock-screen and trial-edit copy", () => {
    expect(t("admin.newOrg.trialDaysHintExpired")).toContain("Istekao");
    expect(t("admin.orgBilling.issueInvoice")).toBe("Izdaj fakturu sada");
    expect(t("orgProfile.openUnpaidInvoice")).toBe("Otvori neplaćenu fakturu");
    expect(t("ops.subscription.trialEnded")).toBe("Probni period istekao:");
    expect(t("auth.invitationAgencyFields")).toBe(
      "Podaci agencije (sva polja sem sajta)",
    );
    expect(t("admin.orgBilling.issueInvoice", undefined, "en")).toBe("Issue invoice now");
  });

  it("falls back to Serbian when an English key is missing", () => {
    expect(t("nav.signOut", undefined, "en")).toBe("Sign out");
  });

  it("returns the key and warns for missing translations", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    // Cast because the missing key isn't in the TypeScript-inferred set.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const out = t("some.missing.key" as any);
    expect(out).toBe("some.missing.key");
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});

describe("parseLocale()", () => {
  it("accepts supported locale codes", () => {
    expect(parseLocale("sr-Latn")).toBe("sr-Latn");
    expect(parseLocale("en")).toBe("en");
  });

  it("normalizes language prefixes", () => {
    expect(parseLocale("sr")).toBe("sr-Latn");
    expect(parseLocale("sr-RS")).toBe("sr-Latn");
    expect(parseLocale("en-US")).toBe("en");
    expect(parseLocale("en-GB")).toBe("en");
  });

  it("rejects unknown values", () => {
    expect(parseLocale(null)).toBeNull();
    expect(parseLocale("")).toBeNull();
    expect(parseLocale("de")).toBeNull();
  });
});

describe("localeFromCookieString()", () => {
  it("reads pd_locale from a cookie header", () => {
    expect(localeFromCookieString("pd_locale=en; Path=/")).toBe("en");
    expect(localeFromCookieString("other=1; pd_locale=sr-Latn")).toBe("sr-Latn");
    expect(localeFromCookieString("session=abc")).toBeNull();
  });
});

describe("localeFromRequest()", () => {
  function req(headers: Record<string, string>, cookie?: string) {
    return {
      headers: { get: (name: string) => headers[name.toLowerCase()] ?? null },
      cookies: { get: (name: string) => (name === "pd_locale" && cookie ? { value: cookie } : undefined) },
    };
  }

  it("prefers x-pd-locale over cookie", () => {
    expect(localeFromRequest(req({ "x-pd-locale": "en" }, "sr-Latn"))).toBe("en");
  });

  it("falls back to cookie then Accept-Language", () => {
    expect(localeFromRequest(req({}, "en"))).toBe("en");
    expect(localeFromRequest(req({ "accept-language": "en-US,en;q=0.9" }))).toBe("en");
    expect(localeFromRequest(req({}))).toBe("sr-Latn");
  });
});
