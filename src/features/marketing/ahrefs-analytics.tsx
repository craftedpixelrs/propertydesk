import Script from "next/script";

/**
 * Ahrefs Web Analytics for the marketing site only.
 *
 * Ahrefs Web Analytics does NOT use cookies and does NOT collect
 * personal data (https://ahrefs.com/web-analytics), so it loads
 * unconditionally for every marketing visitor, unlike Google
 * Analytics which is gated behind cookie consent.
 *
 * The site key is a public identifier - safe to inline. It is kept
 * hardcoded so the CSP `script-src` allowlist in `next.config.ts`
 * can stay tight.
 */
const AHREFS_KEY = "6rrccZTgy+JYa7xFlZwF7Q";

export function AhrefsAnalytics() {
  return (
    <Script
      src="https://analytics.ahrefs.com/analytics.js"
      data-key={AHREFS_KEY}
      strategy="afterInteractive"
    />
  );
}
