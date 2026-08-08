import type { MetadataRoute } from "next";

import { MARKETING_URL } from "@/lib/constants/app";
import { LANDING_ROUTES } from "@/features/marketing/landing/landing-shell";

/**
 * Marketing sitemap.
 *
 * Includes the root landing plus the eight topic landing pages
 * (za-investitore, za-agencije, prodaja-novogradnje, ...). Anchor
 * sections on the root page are also listed for internal SEO
 * discoverability. App routes live behind auth on `my.propertydesk.app`
 * and are explicitly disallowed by [robots.ts](robots.ts).
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const anchors = [
    "video",
    "mogucnosti",
    "za-koga",
    "zakazivanje",
    "rana-ponuda",
    "cenovnik",
    "uskoro",
    "faq",
    "prijava",
  ];

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
    ...anchors.map((anchor) => ({
      url: `${MARKETING_URL}/#${anchor}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];
}
