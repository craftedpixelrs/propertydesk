import { describe, expect, it } from "vitest";

import { navigation } from "@/components/app/navigation";
import { t } from "@/lib/i18n";
import { PAGE_GUIDES, resolvePageGuide } from "./catalog";

describe("resolvePageGuide", () => {
  it("picks the more specific agency registrations route", () => {
    expect(resolvePageGuide("/agencije/registracije")?.key).toBe(
      "agencyRegistrations",
    );
    expect(resolvePageGuide("/agencije")?.key).toBe("agencies");
  });

  it("keeps project detail on the projects guide", () => {
    expect(resolvePageGuide("/projekti/abc/izmena")?.key).toBe("projects");
  });

  it("maps settings tabs separately", () => {
    expect(resolvePageGuide("/podesavanja/organizacija")?.key).toBe("settingsOrg");
    expect(resolvePageGuide("/podesavanja/profil")?.key).toBe("settingsAccount");
    expect(resolvePageGuide("/podesavanja")?.key).toBe("settings");
  });

  it("maps agency settings to the organization guide", () => {
    expect(resolvePageGuide("/agencija/podesavanja")?.key).toBe("settingsOrg");
    expect(resolvePageGuide("/agencija/konekcije")?.key).toBe("connections");
  });

  it("covers every sidebar href", () => {
    for (const item of navigation) {
      expect(resolvePageGuide(item.href), item.href).not.toBeNull();
    }
  });

  it("returns null for unknown routes", () => {
    expect(resolvePageGuide("/sign-in")).toBeNull();
  });

  it("has sr/en copy for every catalog step", () => {
    for (const guide of PAGE_GUIDES) {
      const titleKey = `guides.${guide.key}.title` as Parameters<typeof t>[0];
      expect(t(titleKey)).not.toBe(titleKey);
      expect(t(titleKey, undefined, "en")).not.toBe(titleKey);
      for (let i = 1; i <= guide.steps; i++) {
        const stepTitle = `guides.${guide.key}.s${i}Title` as Parameters<
          typeof t
        >[0];
        const stepBody = `guides.${guide.key}.s${i}Body` as Parameters<
          typeof t
        >[0];
        expect(t(stepTitle)).not.toBe(stepTitle);
        expect(t(stepBody)).not.toBe(stepBody);
        expect(t(stepTitle, undefined, "en")).not.toBe(stepTitle);
      }
    }
  });
});