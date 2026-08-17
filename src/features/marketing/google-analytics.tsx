"use client";

import { useEffect, useState } from "react";
import Script from "next/script";

import { COOKIE_CONSENT_EVENT } from "@/lib/constants/app";
import { readCookieConsent } from "@/features/marketing/cookie-consent";

/**
 * Google Analytics 4 (gtag.js) for the marketing site only.
 *
 * Scripts load only after the visitor accepts analytics cookies.
 * Rejected / no choice → nothing is sent to Google.
 *
 * The measurement ID is hardcoded so the CSP `script-src` allowlist
 * can stay tight (it is a public identifier).
 */
const GA_MEASUREMENT_ID = "G-YG7MV1CG56";

export function GoogleAnalytics() {
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
          gtag('config', '${GA_MEASUREMENT_ID}', { anonymize_ip: true });
        `}
      </Script>
    </>
  );
}
