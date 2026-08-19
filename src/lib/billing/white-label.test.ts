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

  it("honors an explicit features.whiteLabel flag", () => {
    expect(planAllowsWhiteLabel("starter", { whiteLabel: true })).toBe(true);
    expect(planAllowsWhiteLabel("growth", { whiteLabel: false })).toBe(false);
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
});
