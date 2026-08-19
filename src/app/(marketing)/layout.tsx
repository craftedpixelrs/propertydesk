import type { Metadata } from "next";
import { headers } from "next/headers";
import type { ReactNode } from "react";

import { CookieBanner } from "@/features/marketing/cookie-banner";
import { GoogleAnalytics } from "@/features/marketing/google-analytics";
import { MarketingFooter } from "@/features/marketing/marketing-footer";
import { MarketingHeader } from "@/features/marketing/marketing-header";
import { ScrollToTopOnRouteChange } from "@/features/marketing/scroll-to-top-on-route-change";
import { APP_NAME, MARKETING_URL } from "@/lib/constants/app";
import { resolveRequestLocale } from "@/lib/i18n/resolve-locale";
import { hostFromHeaders } from "@/lib/seo/hosts";
import { metadataRobotsForHost } from "@/lib/seo/policy";

/**
 * Public marketing shell for `propertydesk.app`.
 *
 * This layout is deliberately separate from `(dashboard)` so it can:
 *   - be crawled and indexed on `propertydesk.app` only,
 *   - render for anonymous visitors without hitting the session loader,
 *   - use a full-width design that ignores the app sidebar entirely.
 *
 * All "sign in / open the app" CTAs point at `NEXT_PUBLIC_MY_APP_URL` - the
 * marketing site never links into the internal `/dashboard` route by
 * design, so the auth-only surface stays on its own subdomain.
 */
export async function generateMetadata(): Promise<Metadata> {
  const locale = await resolveRequestLocale();
  const host = hostFromHeaders(await headers());
  return {
    metadataBase: new URL(MARKETING_URL),
    robots: metadataRobotsForHost(host),
    openGraph: {
      type: "website",
      locale: locale === "en" ? "en_GB" : "sr_Latn",
      siteName: APP_NAME,
      url: MARKETING_URL,
    },
  };
}

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-[var(--color-surface)] text-[var(--color-foreground)]">
      <ScrollToTopOnRouteChange />
      <MarketingHeader />
      <main id="main-content" role="main" className="flex-1">
        {children}
      </main>
      <MarketingFooter />
      <CookieBanner />
      <GoogleAnalytics />
    </div>
  );
}
