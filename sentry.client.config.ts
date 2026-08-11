import * as Sentry from "@sentry/nextjs";

/**
 * Sentry initialization for the browser bundle.
 *
 * This file is loaded automatically by `@sentry/nextjs` in the client
 * runtime. It is intentionally thin - all sampling is defensive so
 * preview / dev environments don't spend Sentry quota. When
 * `NEXT_PUBLIC_SENTRY_DSN` is not set we still call `init()` with an
 * undefined DSN, which turns the SDK into a no-op (Sentry's own
 * recommendation). This makes the facade behave identically in dev
 * without special-casing.
 */
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn: dsn || undefined,
  enabled: Boolean(dsn),
  environment:
    process.env.SENTRY_ENVIRONMENT ||
    (process.env.NODE_ENV === "production" ? "production" : "development"),
  tracesSampleRate: dsn ? 0.05 : 0,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0.1,
  sendDefaultPii: false,
  ignoreErrors: [
    "ResizeObserver loop limit exceeded",
    "ResizeObserver loop completed with undelivered notifications.",
    "Non-Error promise rejection captured",
    "AbortError",
  ],
  beforeSend(event) {
    const req = event.request as { cookies?: unknown } | undefined;
    if (req?.cookies) delete req.cookies;
    return event;
  },
});
