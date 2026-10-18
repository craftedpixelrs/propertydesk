"use client";

import { useEffect, useState } from "react";
import Script from "next/script";

import { readCookieConsent } from "@/features/marketing/cookie-consent";
import { COOKIE_CONSENT_EVENT } from "@/lib/constants/app";

/**
 * Microsoft Clarity for the marketing site only.
 *
 * Clarity sets cookies and records sessions (heatmaps, clicks), so it
 * loads only after the visitor accepts analytics cookies — same gate
 * as Google Analytics. Rejected / no choice → the tag is not injected.
 *
 * The project id is a public identifier. It stays hardcoded so the CSP
 * `script-src` allowlist in `next.config.ts` can stay tight.
 */
const CLARITY_PROJECT_ID = "yznd0jkv0v";

export function ClarityAnalytics() {
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    function sync() {
      setAllowed(readCookieConsent() === "accepted");
    }
    sync();
    window.addEventListener(COOKIE_CONSENT_EVENT, sync);
    return () => window.removeEventListener(COOKIE_CONSENT_EVENT, sync);
  }, []);

  if (!allowed) return null;

  return (
    <Script id="microsoft-clarity" strategy="afterInteractive">
      {`(function(c,l,a,r,i,t,y){
        c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
        t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
        y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
      })(window, document, "clarity", "script", "${CLARITY_PROJECT_ID}");`}
    </Script>
  );
}
