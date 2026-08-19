import { describe, expect, it } from "vitest";

import {
  hostFromHeaders,
  isAppHost,
  isDemoHost,
  isMarketingHost,
  normalizeHost,
} from "./hosts";

describe("seo hosts", () => {
  it("treats apex and www as marketing", () => {
    expect(isMarketingHost("propertydesk.app")).toBe(true);
    expect(isMarketingHost("www.propertydesk.app:443")).toBe(true);
    expect(isMarketingHost("my.propertydesk.app")).toBe(false);
  });

  it("treats my / demo / staging as app hosts", () => {
    expect(isAppHost("demo.propertydesk.app")).toBe(true);
    expect(isAppHost("staging.propertydesk.app")).toBe(true);
    expect(isAppHost("my.propertydesk.app")).toBe(true);
    expect(isAppHost("propertydesk.app")).toBe(false);
  });

  it("treats only demo. as the public walkthrough host", () => {
    expect(isDemoHost("demo.propertydesk.app")).toBe(true);
    expect(isDemoHost("DEMO.propertydesk.app:443")).toBe(true);
    expect(isDemoHost("staging.propertydesk.app")).toBe(false);
    expect(isDemoHost("my.propertydesk.app")).toBe(false);
    expect(isDemoHost("localhost")).toBe(false);
  });

  it("prefers x-forwarded-host", () => {
    const headers = new Headers({
      host: "localhost:3000",
      "x-forwarded-host": "My.Propertydesk.App",
    });
    expect(normalizeHost(hostFromHeaders(headers))).toBe("my.propertydesk.app");
    expect(isAppHost(hostFromHeaders(headers))).toBe(true);
  });
});
