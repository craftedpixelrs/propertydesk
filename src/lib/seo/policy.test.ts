import { describe, expect, it } from "vitest";

import { MARKETING_URL } from "@/lib/constants/app";

import {
  APP_PATH_DISALLOWS,
  buildRobotsPolicy,
  buildSitemapEntries,
  metadataRobotsForHost,
} from "./policy";

describe("seo policy", () => {
  it("indexes only the marketing apex", () => {
    expect(metadataRobotsForHost("propertydesk.app")?.index).toBe(true);
    expect(metadataRobotsForHost("www.propertydesk.app")?.index).toBe(true);
    expect(metadataRobotsForHost("my.propertydesk.app")?.index).toBe(false);
    expect(metadataRobotsForHost("demo.propertydesk.app")?.index).toBe(false);
    expect(metadataRobotsForHost("staging.propertydesk.app")?.index).toBe(false);
    expect(metadataRobotsForHost("localhost")).toBeTruthy();
    expect(metadataRobotsForHost("localhost")?.index).toBe(false);
  });

  it("advertises a sitemap only on the apex", () => {
    const marketing = buildRobotsPolicy("propertydesk.app");
    expect(marketing.sitemap).toBe(`${MARKETING_URL}/sitemap.xml`);
    expect(marketing.host).toBe(MARKETING_URL);

    const app = buildRobotsPolicy("my.propertydesk.app");
    expect(app.sitemap).toBeUndefined();
    expect(app.host).toBeUndefined();
    expect(app.rules).toEqual(marketing.rules);
  });

  it("does not blanket-disallow app hosts so Google can honor noindex", () => {
    const app = buildRobotsPolicy("demo.propertydesk.app");
    const rule = Array.isArray(app.rules) ? app.rules[0] : app.rules;
    expect(rule?.allow).toBe("/");
    expect(rule?.disallow).toEqual([...APP_PATH_DISALLOWS]);
    expect(rule?.disallow).not.toContain("/");
  });

  it("lists only real apex URLs and never hash anchors", () => {
    const now = new Date("2026-08-19T00:00:00.000Z");
    expect(buildSitemapEntries("my.propertydesk.app", now)).toEqual([]);

    const urls = buildSitemapEntries("propertydesk.app", now).map((e) => e.url);
    expect(urls[0]).toBe(`${MARKETING_URL}/`);
    expect(urls).toContain(`${MARKETING_URL}/demo`);
    expect(urls).toContain(`${MARKETING_URL}/za-investitore`);
    expect(urls).toContain(`${MARKETING_URL}/o-nama`);
    expect(urls).toContain(`${MARKETING_URL}/blog`);
    expect(urls).toContain(`${MARKETING_URL}/blog/ips-qr-kapara-online-rezervacija-stana`);
    expect(urls).toContain(`${MARKETING_URL}/privatnost`);
    expect(urls.every((url) => !url.includes("#"))).toBe(true);
    expect(urls.every((url) => url.startsWith(MARKETING_URL))).toBe(true);
    expect(urls.every((url) => !url.includes("my."))).toBe(true);
  });

  it("lists the city hub and every city page", () => {
    const now = new Date("2026-08-19T00:00:00.000Z");
    const urls = buildSitemapEntries("propertydesk.app", now).map((e) => e.url);

    expect(urls).toContain(`${MARKETING_URL}/softver-za-prodaju-novogradnje`);
    expect(urls).toContain(`${MARKETING_URL}/softver-za-prodaju-novogradnje/beograd`);
    expect(urls).toContain(`${MARKETING_URL}/softver-za-prodaju-novogradnje/novi-sad`);
    expect(urls).toContain(`${MARKETING_URL}/softver-za-prodaju-novogradnje/zlatibor`);

    // No duplicates - each URL should appear exactly once.
    expect(new Set(urls).size).toBe(urls.length);
  });
});
