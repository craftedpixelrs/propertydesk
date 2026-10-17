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
        className="pd-rise pointer-events-auto w-full max-w-md rounded-3xl border border-white/10 bg-[#0b1020] p-5 text-[#f7f3ea] shadow-[0_24px_70px_-28px_rgba(0,0,0,0.7)]"
      >
        <div className="flex items-start gap-3">
          <span
            aria-hidden
            className="grid size-10 flex-none place-items-center rounded-2xl bg-[#d6b26a]/15 text-[#f3e2bc]"
          >
            <Cookie className="size-5" />
          </span>
          <div className="min-w-0">
            <h2 id="cookie-banner-title" className="font-display text-lg font-semibold">
              {t("marketing.cookies.title")}
            </h2>
            <p id="cookie-banner-body" className="mt-1.5 text-sm leading-relaxed text-white/65">
              {t("marketing.cookies.body")}{" "}
              <Link
                href="/privatnost#kolacici"
                className="text-[#f3e2bc] underline decoration-[#d6b26a]/50 underline-offset-2 hover:text-white"
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
            className={marketingCta("outlineDark", "sm", "w-full")}
            onClick={() => {
              writeCookieConsent("rejected");
              setVisible(false);
            }}
          >
            {t("marketing.cookies.reject")}
          </button>
          <button
            type="button"
            className={marketingCta("cream", "sm", "w-full")}
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
      className="text-white/65 hover:text-white"
      onClick={() => {
        window.dispatchEvent(new Event(COOKIE_SETTINGS_EVENT));
      }}
    >
      {t("marketing.footer.cookies")}
    </button>
  );
}
