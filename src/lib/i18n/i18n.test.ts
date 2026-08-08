import { describe, expect, it, vi } from "vitest";
import { t } from "./index";

describe("t()", () => {
  it("returns a Serbian Latin string for known keys", () => {
    expect(t("nav.dashboard")).toBe("Kontrolna tabla");
    expect(t("nav.projects")).toBe("Projekti");
    expect(t("nav.reservations")).toBe("Rezervacije");
    expect(t("common.save")).toBe("Sačuvaj");
  });

  it("uses Serbian diacritics correctly", () => {
    expect(t("nav.signOut")).toBe("Odjavi se");
    expect(t("nav.paymentPlans")).toBe("Planovi plaćanja");
    expect(t("common.comingSoon")).toBe("Uskoro");
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
