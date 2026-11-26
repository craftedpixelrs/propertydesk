"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Cookie } from "lucide-react";

import { useT } from "@/components/app/i18n-provider";
import { COOKIE_SETTINGS_EVENT } from "@/lib/constants/app";
import { marketingCta } from "@/features/marketing/marketing-cta";
import { readCookieConsent, writeCookieConsent } from "@/features/marketing/cookie-consent";

export function CookieBanner() {
  const t = useT();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(readCookieConsent() === null);

    function onOpen() {
      setVisible(true);
    }
    window.addEventListener(COOKIE_SETTINGS_EVENT, onOpen);
    return () => window.removeEventListener(COOKIE_SETTINGS_EVENT, onOpen);
  }, []);

  if (!visible) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center p-3 sm:justify-end sm:p-5">
      <div
        role="dialog"
        aria-labelledby="cookie-banner-title"
        aria-describedby="cookie-banner-body"
        className="pd-rise border-line text-ink pointer-events-auto w-full max-w-md rounded-2xl border bg-white p-5 shadow-[0_32px_70px_-30px_rgba(10,27,61,0.55)]"
      >
        <div className="flex items-start gap-3">
          <span
            aria-hidden
            className="bg-tide-50 text-tide-700 grid size-10 flex-none place-items-center rounded-[10px]"
          >
            <Cookie className="size-5" />
          </span>
          <div className="min-w-0">
            <h2 id="cookie-banner-title" className="text-base font-bold tracking-[-0.02em]">
              {t("marketing.cookies.title")}
            </h2>
            <p id="cookie-banner-body" className="text-mute mt-1.5 text-sm leading-relaxed">
              {t("marketing.cookies.body")}{" "}
              <Link
                href="/privatnost#kolacici"
                className="text-tide-700 hover:text-ink font-medium underline underline-offset-2"
              >
                {t("marketing.cookies.privacyLink")}
              </Link>
              .
            </p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            className={marketingCta("outline", "sm", "w-full")}
            onClick={() => {
              writeCookieConsent("rejected");
              setVisible(false);
            }}
          >
            {t("marketing.cookies.reject")}
          </button>
          <button
            type="button"
            className={marketingCta("ink", "sm", "w-full")}
            onClick={() => {
              writeCookieConsent("accepted");
              setVisible(false);
            }}
          >
            {t("marketing.cookies.accept")}
          </button>
        </div>
      </div>
    </div>
  );
}

export function CookieSettingsButton() {
  const t = useT();
  return (
    <button
      type="button"
      className="text-white/60 transition-colors hover:text-white"
      onClick={() => {
        window.dispatchEvent(new Event(COOKIE_SETTINGS_EVENT));
      }}
    >
      {t("marketing.footer.cookies")}
    </button>
  );
}
