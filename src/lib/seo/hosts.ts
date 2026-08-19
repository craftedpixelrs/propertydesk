/**
 * Which public hosts Google may index.
 *
 * Only the marketing apex is crawlable. Authenticated / preview app
 * hosts must never appear in search results — even if a crawler hits
 * them directly or follows a leaked dashboard URL.
 */

export const MARKETING_HOSTS = new Set([
  "propertydesk.app",
  "www.propertydesk.app",
]);

export const APP_HOSTS = new Set([
  "my.propertydesk.app",
  "demo.propertydesk.app",
  "staging.propertydesk.app",
]);

export const DEMO_HOST = "demo.propertydesk.app";

export const NOINDEX_ROBOTS_TAG = "noindex, nofollow, noarchive";

export function normalizeHost(host: string): string {
  return host.split(":")[0]!.toLowerCase();
}

export function isMarketingHost(host: string): boolean {
  return MARKETING_HOSTS.has(normalizeHost(host));
}

export function isAppHost(host: string): boolean {
  return APP_HOSTS.has(normalizeHost(host));
}

export function isDemoHost(host: string): boolean {
  return normalizeHost(host) === DEMO_HOST;
}

export function hostFromHeaders(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-host");
  if (forwarded) return normalizeHost(forwarded);
  return normalizeHost(headers.get("host") ?? "");
}
