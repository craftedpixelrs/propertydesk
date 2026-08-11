import type { NextConfig } from "next";
import path from "node:path";
import { withSentryConfig } from "@sentry/nextjs";

// Type-checking is enforced as a dedicated CI gate (`pnpm typecheck` via
// tsc). Next's bundled in-build TypeScript integration is skipped because
// it isn't yet compatible with the TypeScript 7 (native) compiler this
// project uses and would crash the build worker while trying to re-resolve
// `typescript`. Linting is likewise enforced separately (`pnpm lint`); the
// `eslint.ignoreDuringBuilds` option was removed in Next 16 (Next no longer
// runs ESLint during the build), so there is nothing to configure here.
const isProd = process.env.NODE_ENV === "production";

/**
 * Baseline security headers applied globally.
 *
 * - HSTS is emitted only in production (never in dev; would break localhost).
 * - The CSP intentionally allows `'unsafe-inline'` for styles because
 *   Next.js hydration relies on inline style tags. Scripts are locked down
 *   with `'strict-dynamic'` fallback via nonce+hashes at request-time is a
 *   future hardening, not required for launch.
 * - `Permissions-Policy` denies dangerous surfaces we do not use.
 */
const securityHeaders: Array<{ key: string; value: string }> = [
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "style-src 'self' 'unsafe-inline'",
      // Google Analytics (gtag.js) is loaded on the marketing landing
      // route only. Its runtime script origin is
      // `www.googletagmanager.com`, and it POSTs metrics to
      // `www.google-analytics.com` / regional shards.
      //
      // `static.cloudflareinsights.com` is the Web Analytics beacon that
      // Cloudflare injects into the HTML at the edge. We never reference
      // it ourselves, so without this entry every proxied page logs a CSP
      // violation. Remove it if Web Analytics is turned off in Cloudflare.
      //
      // `unsafe-eval` is required by Next.js dev/turbopack; production
      // still needs `unsafe-inline` for hydration inline scripts.
      isProd
        ? "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com https://static.cloudflareinsights.com"
        : "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com https://static.cloudflareinsights.com",
      "connect-src 'self' https: wss:",
      "worker-src 'self' blob:",
      "object-src 'none'",
      "upgrade-insecure-requests",
    ].join("; "),
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: [
      "accelerometer=()",
      "camera=()",
      "geolocation=()",
      "gyroscope=()",
      "microphone=()",
      "payment=()",
      "usb=()",
    ].join(", "),
  },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
  ...(isProd
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
      ]
    : []),
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "standalone",
  typedRoutes: false,
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [],
  },
  // Explicit alias for `@/*` -> `src/*`. Turbopack picks this up from
  // tsconfig automatically, but Webpack in Next 16 does not honour
  // tsconfig `paths` reliably when the project has `moduleResolution:
  // "bundler"` and no `baseUrl` (see docs/deploy/vps.md). Providing an
  // explicit alias here keeps `next build --webpack` happy.
  webpack(config) {
    config.resolve = config.resolve ?? {};
    config.resolve.alias = {
      ...(config.resolve.alias ?? {}),
      // `process.cwd()` is the project root when `next build` runs.
      // Avoid `import.meta.url` / `__dirname` here — Next compiles this
      // file into a CJS shim and the resulting `.js` runs inside an ESM
      // scope (see package.json `"type": "module"`), breaking both.
      "@": path.resolve(process.cwd(), "src"),
    };
    return config;
  },
  async headers() {
    return [
      {
        // Match every route including static assets.
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

/**
 * Wrap the Next config with Sentry's build-time plugin. It:
 *
 *   - Uploads source maps to Sentry when `SENTRY_AUTH_TOKEN`,
 *     `SENTRY_ORG`, and `SENTRY_PROJECT` are set at build time.
 *   - Injects the release identifier into the client bundle for
 *     symbolication.
 *   - Auto-instruments Next.js server code paths.
 *
 * All options are safe no-ops when the corresponding env vars are
 * missing (Sentry logs a warning during `next build` but never fails
 * the build).
 */
const sentryBuildConfigured =
  Boolean(process.env.SENTRY_AUTH_TOKEN) &&
  Boolean(process.env.SENTRY_ORG) &&
  Boolean(process.env.SENTRY_PROJECT);

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  // Only upload source maps when the auth-token/org/project triple is
  // fully configured. Otherwise the plugin is a no-op wrapper that
  // still injects the runtime helpers.
  sourcemaps: {
    disable: !sentryBuildConfigured,
    deleteSourcemapsAfterUpload: true,
  },
  silent: !process.env.CI,
  widenClientFileUpload: true,
  reactComponentAnnotation: { enabled: false },
  disableLogger: true,
  // We do not use Sentry's ad-block bypass tunnel; the CSP already
  // allows `connect-src https:` for Sentry ingest hosts.
  tunnelRoute: undefined,
  automaticVercelMonitors: false,
});
