"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * Forces the window to scroll to (0, 0) instantly on every marketing route
 * change (e.g. navigating from `/` to `/za-investitore`).
 *
 * Why this exists:
 * We enable `scroll-behavior: smooth` globally so in-page anchor jumps
 * (`href="#faq"`) animate. But that same rule ALSO animates the
 * scrollTo(0, 0) that Next.js triggers on route change - and if the user
 * was scrolled deep on the previous page, they briefly see the new page
 * scrolled part-way down before the smooth animation catches up. That
 * looks like the page opened "with an offset".
 *
 * Passing `behavior: "instant"` overrides the CSS rule for that single
 * call, so route changes always land at the very top. We do NOT reset
 * when the URL carries a hash (`/za-investitore#zakazivanje`), because
 * there the intent is to jump to that section.
 */
export function ScrollToTopOnRouteChange() {
  const pathname = usePathname();
  const prev = useRef<string | null>(null);

  useEffect(() => {
    if (prev.current !== null && prev.current !== pathname) {
      if (!window.location.hash) {
        window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
      }
    }
    prev.current = pathname;
  }, [pathname]);

  return null;
}
