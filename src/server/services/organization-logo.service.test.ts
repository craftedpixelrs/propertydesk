import { describe, expect, it } from "vitest";

import {
  organizationLogoPublicPath,
  parseLogoVariant,
} from "./organization-logo.service";

describe("parseLogoVariant", () => {
  it("treats light as the only explicit variant", () => {
    expect(parseLogoVariant("light")).toBe("light");
    expect(parseLogoVariant("default")).toBe("default");
    expect(parseLogoVariant(null)).toBe("default");
    expect(parseLogoVariant(undefined)).toBe("default");
  });
});

describe("organizationLogoPublicPath", () => {
  it("keeps the default logo on the unadorned public route", () => {
    expect(organizationLogoPublicPath("org_1")).toBe(
      "/api/v1/public/organization-logo/org_1",
    );
  });

  it("puts the light mark behind a query param", () => {
    expect(organizationLogoPublicPath("org_1", "light")).toBe(
      "/api/v1/public/organization-logo/org_1?variant=light",
    );
  });
});
