import { NextRequest, NextResponse } from "next/server";

/**
 * App-wide middleware.
 *
 * Caddy terminates TLS and forwards by host. Marketing lives only on
 * the apex. Authenticated app hosts (`my.`, `demo.`, `staging.`) share
 * this code but each runs in its own container / database — see
 * `docs/environments.md`.
 *
 *   1) App subdomain `/` → 308 `/sign-in`.
 *   2) Marketing-only paths on an app host → 308 to
 *      `https://propertydesk.app/<path>` (keep SEO on the apex).
 *   3) Everything else passes through.
 */

const APP_SUBDOMAINS = new Set([
  "my.propertydesk.app",
  "demo.propertydesk.app",
  "staging.propertydesk.app",
]);

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
  if (forwarded) return forwarded.split(":")[0]!.toLowerCase();
  const host = request.headers.get("host");
  if (host) return host.split(":")[0]!.toLowerCase();
  return request.nextUrl.host.split(":")[0]!.toLowerCase();
}

/**
 * C2 — Referral cookie handler.
 *
 * On any request that carries a `?ref=CODE` query, we persist the code
 * to a 30-day `pd_ref` cookie. This makes referral attribution robust
 * when a visitor:
 *   - lands on a marketing page first, then browses to `/p/<token>`,
 *   - opens a public share link in a mobile browser and only later
 *     submits the reservation form,
 *   - shares the link with a family member — as long as they don't
 *     manually strip the query, the cookie keeps the attribution.
 *
 * The cookie is deliberately **not** HttpOnly so the reservation form
 * (which is a Client Component) can read it via `document.cookie`.
 * The only side effect of a leaked cookie is a mis-attributed
 * commission, which is a business concern rather than a security one.
 */
function applyReferralCookie(
  request: NextRequest,
  response: NextResponse,
): NextResponse {
  const raw = request.nextUrl.searchParams.get("ref");
  if (!raw) return response;
  const clean = raw.trim().replace(/[^A-Z0-9a-z_-]/g, "").slice(0, 32);
  if (!clean) return response;
  response.cookies.set("pd_ref", clean, {
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
    sameSite: "lax",
    // NOT httpOnly — the reservation form (Client Component) needs it.
    secure: request.nextUrl.protocol === "https:",
  });
  return response;
}

function passThrough(request: NextRequest): NextResponse {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", request.nextUrl.pathname);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export function middleware(request: NextRequest) {
  const host = resolveHost(request);
  const { pathname, search } = request.nextUrl;

  const isAppSubdomain = APP_SUBDOMAINS.has(host);
  if (!isAppSubdomain) return applyReferralCookie(request, passThrough(request));

  if (pathname === "/" || pathname === "") {
    const signIn = request.nextUrl.clone();
    signIn.pathname = "/sign-in";
    signIn.search = search;
    return applyReferralCookie(request, NextResponse.redirect(signIn, 308));
  }

  const firstSegment = pathname.split("/", 2)[1] ?? "";
  if (MARKETING_ONLY_PATHS.has(firstSegment)) {
    return applyReferralCookie(
      request,
      NextResponse.redirect(
        new URL(`https://propertydesk.app${pathname}${search}`),
        308,
      ),
    );
  }

  return applyReferralCookie(request, passThrough(request));
}

export const config = {
  // Skip Next.js internals, static assets and the health / robots /
  // sitemap endpoints (those must respond on any hostname without a
  // hop).
  matcher: [
    "/((?!_next/|api/|icons/|images/|.*\\..*|robots\\.txt|sitemap\\.xml|favicon\\.ico|opengraph-image|manifest).*)",
  ],
};
