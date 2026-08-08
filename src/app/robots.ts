import type { MetadataRoute } from "next";

import { MARKETING_URL } from "@/lib/constants/app";

/**
 * Robots policy for the marketing site (propertydesk.app).
 *
 * The apex domain hosts the public landing page and is indexable. All
 * app-only surfaces (`/dashboard`, `/administracija`, auth flows, API,
 * etc.) live on `my.propertydesk.app` in production, but we still
 * disallow them here in case the same deployment ever serves both.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
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
        ],
      },
    ],
    sitemap: `${MARKETING_URL}/sitemap.xml`,
    host: MARKETING_URL,
  };
}
