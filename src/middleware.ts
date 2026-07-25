import { NextRequest, NextResponse } from "next/server";

/**
 * App-wide middleware.
 *
 * The Docker container serves TWO public origins from the same Next.js
 * app behind Caddy:
 *   * `propertydesk.app` (apex) - public marketing landing + topic pages
 *   * `my.propertydesk.app`      - authenticated SaaS product
 *
 * The `(marketing)` and `(dashboard)` route groups both mount at `/`,
 * so we need a small host-aware nudge:
 *
 *   1) `my.propertydesk.app/`
 *      → 308 redirect to `/sign-in`.
 *      Visitors landing on the app subdomain must first authenticate;
 *      the marketing landing lives on the apex domain and should not
 *      be reachable via `my.` (it would double-index).
 *
 *   2) Marketing-only paths on `my.propertydesk.app`
 *      (`/za-investitore`, `/za-agencije`, `/prodaja-novogradnje`,
 *       `/crm-za-investitore`, `/alternative-excelu`,
 *       `/rezervacije-i-uplate`, `/provizije-agencija`, `/demo`)
 *      → 308 redirect to `https://propertydesk.app/<same-path>` so we
 *      never split SEO signal across two hostnames.
 *
 *   3) Everything else (auth flows, API, dashboard, etc.) passes
 *      through untouched.
 */

// Reserved marketing slugs that must only live on the apex domain.
const MARKETING_ONLY_PATHS = new Set([
  "za-investitore",
  "za-agencije",
  "prodaja-novogradnje",
  "crm-za-investitore",
  "alternative-excelu",
  "rezervacije-i-uplate",
  "provizije-agencija",
  "demo",
]);

function resolveHost(request: NextRequest): string {
  // Prefer the forwarded host set by Caddy - `request.nextUrl.host` can
  // reflect the *internal* origin (localhost:3000) when the app runs
  // inside Docker.
  const forwarded = request.headers.get("x-forwarded-host");
  if (forwarded) return forwarded.toLowerCase();
  const host = request.headers.get("host");
  if (host) return host.toLowerCase();
  return request.nextUrl.host.toLowerCase();
}

export function middleware(request: NextRequest) {
  const host = resolveHost(request);
  const { pathname, search } = request.nextUrl;

  const isAppSubdomain = host === "my.propertydesk.app";
  if (!isAppSubdomain) return NextResponse.next();

  if (pathname === "/" || pathname === "") {
    const signIn = request.nextUrl.clone();
    signIn.pathname = "/sign-in";
    signIn.search = search;
    return NextResponse.redirect(signIn, 308);
  }

  const firstSegment = pathname.split("/", 2)[1] ?? "";
  if (MARKETING_ONLY_PATHS.has(firstSegment)) {
    return NextResponse.redirect(
      new URL(`https://propertydesk.app${pathname}${search}`),
      308,
    );
  }

  return NextResponse.next();
}

export const config = {
  // Skip Next.js internals, static assets and the health / robots /
  // sitemap endpoints (those must respond on any hostname without a
  // hop).
  matcher: [
    "/((?!_next/|api/|icons/|images/|.*\\..*|robots\\.txt|sitemap\\.xml|favicon\\.ico|opengraph-image|manifest).*)",
  ],
};
