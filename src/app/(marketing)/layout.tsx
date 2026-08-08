import type { ReactNode } from "react";

import { GoogleAnalytics } from "@/features/marketing/google-analytics";
import { MarketingHeader } from "@/features/marketing/marketing-header";
import { MarketingFooter } from "@/features/marketing/marketing-footer";
import { ScrollToTopOnRouteChange } from "@/features/marketing/scroll-to-top-on-route-change";

/**
 * Public marketing shell for `propertydesk.app`.
 *
 * This layout is deliberately separate from `(dashboard)` so it can:
 *   - be crawled and indexed by search engines,
 *   - render for anonymous visitors without hitting the session loader,
 *   - use a full-width design that ignores the app sidebar entirely.
 *
 * All "sign in / open the app" CTAs point at `NEXT_PUBLIC_MY_APP_URL` - the
 * marketing site never links into the internal `/dashboard` route by
 * design, so the auth-only surface stays on its own subdomain.
 */
export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-[var(--color-surface)] text-[var(--color-foreground)]">
      <ScrollToTopOnRouteChange />
      <MarketingHeader />
      <main id="main-content" role="main" className="flex-1">
        {children}
      </main>
      <MarketingFooter />
      <GoogleAnalytics />
    </div>
  );
}
