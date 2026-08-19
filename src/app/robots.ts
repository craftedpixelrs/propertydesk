import type { MetadataRoute } from "next";
import { headers } from "next/headers";

import { hostFromHeaders } from "@/lib/seo/hosts";
import { buildRobotsPolicy } from "@/lib/seo/policy";

/**
 * Host-aware robots.txt.
 *
 * `propertydesk.app` is the only origin that advertises a sitemap.
 * `my.`, `demo.`, `staging.`, and localhost stay out of the index via
 * HTML robots + `X-Robots-Tag` (see `docs/environments.md`).
 */
export default async function robots(): Promise<MetadataRoute.Robots> {
  return buildRobotsPolicy(hostFromHeaders(await headers()));
}
