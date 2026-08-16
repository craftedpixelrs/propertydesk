"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect, useMemo, useState } from "react";

import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  htmlLang,
  parseLocale,
  t,
  type Locale,
} from "@/lib/i18n";

/**
 * Root-level error boundary. Catches exceptions in the root layout —
 * because it replaces the entire document, it must render its own
 * `<html>` / `<body>` and cannot depend on `Providers` or i18n bootstrap.
 */
function localeFromDocumentCookie(): Locale {
  if (typeof document === "undefined") return DEFAULT_LOCALE;
  const prefix = `${LOCALE_COOKIE}=`;
  const raw = document.cookie
    .split("; ")
    .find((row) => row.startsWith(prefix))
    ?.slice(prefix.length);
  return parseLocale(raw) ?? DEFAULT_LOCALE;
}

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [locale, setLocale] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    setLocale(localeFromDocumentCookie());
  }, []);

  useEffect(() => {
    // Forward the root-level crash to Sentry. `captureException` is a
    // no-op when the DSN is not configured.
    Sentry.captureException(error);
  }, [error]);

  const copy = useMemo(
    () => ({
      kicker: t("pages.globalErrorKicker", undefined, locale),
      title: t("pages.globalErrorTitle", undefined, locale),
      body: t("pages.globalErrorBody", {
        digest: error.digest ?? "—",
      }, locale),
      retry: t("common.retry", undefined, locale),
    }),
    [error.digest, locale],
  );

  return (
    <html lang={htmlLang(locale)}>
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily:
            "system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, sans-serif",
          backgroundColor: "#f8fafc",
          color: "#0f172a",
        }}
      >
        <main
          role="main"
          style={{ maxWidth: 480, padding: 24, textAlign: "center" }}
        >
          <p
            style={{
              fontSize: 12,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: 2,
              color: "#dc2626",
            }}
          >
            {copy.kicker}
          </p>
          <h1 style={{ marginTop: 8, fontSize: 24, fontWeight: 600 }}>
            {copy.title}
          </h1>
          <p style={{ marginTop: 12, fontSize: 14, color: "#475569" }}>
            {copy.body}
          </p>
          <div style={{ marginTop: 24 }}>
            <button
              type="button"
              onClick={() => reset()}
              style={{
                padding: "10px 20px",
                borderRadius: 6,
                background: "#0f766e",
                color: "#fff",
                fontWeight: 500,
                border: 0,
                cursor: "pointer",
              }}
            >
              {copy.retry}
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
