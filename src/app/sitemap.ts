import type { MetadataRoute } from "next";
import { headers } from "next/headers";

import { hostFromHeaders } from "@/lib/seo/hosts";
import { buildSitemapEntries } from "@/lib/seo/policy";

/**
 * Sitemap is advertised only on the marketing apex. App hosts return an
 * empty list so `my.` / `demo.` / `staging.` never advertise URLs.
 *
 * Hash anchors (`/#faq`) are omitted — they are not valid sitemap
 * entries and Google ignores or warns on them.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return buildSitemapEntries(hostFromHeaders(await headers()), new Date());
}
