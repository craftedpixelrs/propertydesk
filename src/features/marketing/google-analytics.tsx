import Script from "next/script";

/**
 * Google Analytics 4 (gtag.js) loader for the marketing site only.
 *
 * We deliberately mount this from `(marketing)/layout.tsx` and NOT from
 * the root layout - the internal `(dashboard)` surface handles its own
 * anonymised product analytics and should not send anything to Google.
 *
 * Both scripts use `strategy="afterInteractive"` so they load after the
 * page is interactive without blocking First Contentful Paint. The
 * inline `gtag('config', ...)` call fires the first pageview
 * automatically; subsequent SPA transitions are tracked by GA4's
 * built-in `page_view` auto-events (enhanced measurement).
 *
 * The measurement ID is intentionally hardcoded rather than pulled from
 * env, because it's a public identifier and hardcoding lets the CSP
 * `script-src` allowlist stay tight.
 */
const GA_MEASUREMENT_ID = "G-YG7MV1CG56";

export function GoogleAnalytics() {
  return (
    <>
      <Script
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
      />
      <Script id="gtag-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_MEASUREMENT_ID}');
        `}
      </Script>
    </>
  );
}
