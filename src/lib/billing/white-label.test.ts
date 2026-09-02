import { describe, expect, it } from "vitest";

import { planAllowsWhiteLabel, withLogoCacheBust } from "./white-label";

describe("planAllowsWhiteLabel", () => {
  it("enables Growth and Scale by plan code", () => {
    expect(planAllowsWhiteLabel("growth")).toBe(true);
    expect(planAllowsWhiteLabel("Scale")).toBe(true);
  });

  it("keeps Starter and trial on PropertyDesk chrome", () => {
    expect(planAllowsWhiteLabel("starter")).toBe(false);
    expect(planAllowsWhiteLabel("trial")).toBe(false);
    expect(planAllowsWhiteLabel(null)).toBe(false);
  });

  it("keeps Growth and Scale white-label even if features.whiteLabel is false", () => {
    expect(planAllowsWhiteLabel("growth", { whiteLabel: false })).toBe(true);
    expect(planAllowsWhiteLabel("scale", { whiteLabel: false })).toBe(true);
  });

  it("allows an explicit features.whiteLabel flag on other plans", () => {
    expect(planAllowsWhiteLabel("starter", { whiteLabel: true })).toBe(true);
  });
});

describe("withLogoCacheBust", () => {
  it("leaves external https logos untouched", () => {
    expect(withLogoCacheBust("https://cdn.example.com/logo.png", 1)).toBe(
      "https://cdn.example.com/logo.png",
    );
  });

  it("appends a version query to the public logo route", () => {
    expect(
      withLogoCacheBust("/api/v1/public/organization-logo/org_1", new Date(1000)),
    ).toBe("/api/v1/public/organization-logo/org_1?v=1000");
  });

  it("appends a version query after an existing variant param", () => {
    expect(
      withLogoCacheBust(
        "/api/v1/public/organization-logo/org_1?variant=light",
        new Date(1000),
      ),
    ).toBe("/api/v1/public/organization-logo/org_1?variant=light&v=1000");
  });
});
