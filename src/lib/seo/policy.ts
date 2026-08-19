import type { Metadata, MetadataRoute } from "next";

import { LANDING_ROUTES } from "@/features/marketing/landing/landing-shell";
import { MARKETING_URL } from "@/lib/constants/app";

import { isMarketingHost } from "./hosts";

/**
 * Paths that must never appear as search results, even on the apex.
 * Marketing pages are allow-listed by omission.
 */
export const APP_PATH_DISALLOWS = [
  "/api/",
  "/api-docs",
  "/dashboard",
  "/dashboard/",
  "/administracija",
  "/administracija/",
  "/podesavanja",
  "/podesavanja/",
  "/sign-in",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/accept-invitation",
  "/obavestenja",
  "/odrzavanje",
  "/p/",
] as const;

export const LEGAL_SITEMAP_SLUGS = [
  "o-nama",
  "pomoc",
  "privatnost",
  "uslovi",
  "impresum",
] as const;

export const INDEX_ROBOTS = {
  index: true,
  follow: true,
  googleBot: {
    index: true,
    follow: true,
    "max-image-preview": "large" as const,
    "max-snippet": -1,
  },
} satisfies Metadata["robots"];

export const NOINDEX_ROBOTS = {
  index: false,
  follow: false,
  nocache: true,
  googleBot: {
    index: false,
    follow: false,
    noimageindex: true,
  },
} satisfies Metadata["robots"];

export function metadataRobotsForHost(host: string): Metadata["robots"] {
  return isMarketingHost(host) ? INDEX_ROBOTS : NOINDEX_ROBOTS;
}

/**
 * Host-aware robots.txt.
 *
 * Apex: allow marketing, list the sitemap.
 * App / unknown hosts: still allow crawl of public HTML so Google can
 * honor `noindex` + `X-Robots-Tag` and drop leaked app URLs. Do not
 * advertise a sitemap — `Disallow: /` would hide the noindex tag and
 * can leave already-indexed `my.` URLs in the index forever.
 */
export function buildRobotsPolicy(host: string): MetadataRoute.Robots {
  const rules = [
    {
      userAgent: "*",
      allow: "/",
      disallow: [...APP_PATH_DISALLOWS],
    },
  ];

  if (!isMarketingHost(host)) {
    return { rules };
  }

  return {
    rules,
    sitemap: `${MARKETING_URL}/sitemap.xml`,
    host: MARKETING_URL,
  };
}

export function buildSitemapEntries(
  host: string,
  now: Date,
): MetadataRoute.Sitemap {
  if (!isMarketingHost(host)) return [];

  return [
    {
      url: `${MARKETING_URL}/`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    ...LANDING_ROUTES.map((r) => ({
      url: `${MARKETING_URL}/${r.slug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: r.slug === "demo" ? 0.9 : 0.8,
    })),
    ...LEGAL_SITEMAP_SLUGS.map((slug) => ({
      url: `${MARKETING_URL}/${slug}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: slug === "o-nama" || slug === "pomoc" ? 0.6 : 0.4,
    })),
  ];
}
