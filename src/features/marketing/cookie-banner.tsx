"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { useT } from "@/components/app/i18n-provider";
import { COOKIE_SETTINGS_EVENT } from "@/lib/constants/app";
import {
  readCookieConsent,
  writeCookieConsent,
} from "@/features/marketing/cookie-consent";

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
    <div
      role="dialog"
      aria-labelledby="cookie-banner-title"
      aria-describedby="cookie-banner-body"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-[var(--color-border)] bg-[var(--color-surface)]/95 p-4 shadow-[0_-8px_30px_rgba(15,23,42,0.08)] backdrop-blur"
    >
      <div className="container-app flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <h2
            id="cookie-banner-title"
            className="text-sm font-semibold text-[var(--color-foreground)]"
          >
            {t("marketing.cookies.title")}
          </h2>
          <p
            id="cookie-banner-body"
            className="mt-1 text-sm leading-relaxed text-[var(--color-foreground-muted)]"
          >
            {t("marketing.cookies.body")}{" "}
            <Link
              href="/privatnost#kolacici"
              className="underline hover:text-[var(--color-foreground)]"
            >
              {t("marketing.cookies.privacyLink")}
            </Link>
            .
          </p>
        </div>
        <div className="flex flex-none flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              writeCookieConsent("rejected");
              setVisible(false);
            }}
          >
            {t("marketing.cookies.reject")}
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => {
              writeCookieConsent("accepted");
              setVisible(false);
            }}
          >
            {t("marketing.cookies.accept")}
          </Button>
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
      className="text-[var(--color-foreground-muted)] hover:text-[var(--color-foreground)]"
      onClick={() => {
        window.dispatchEvent(new Event(COOKIE_SETTINGS_EVENT));
      }}
    >
      {t("marketing.footer.cookies")}
    </button>
  );
}
