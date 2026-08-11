import * as Sentry from "@sentry/nextjs";

/**
 * Sentry initialization for the edge runtime (middleware, edge route
 * handlers). Runs in a V8 isolate without Node built-ins, so we keep
 * this config minimal - no profiling, no console integration.
 */
const dsn = process.env.SENTRY_DSN;

const parseRate = (value: string | undefined, fallback: number): number => {
  if (!value) return fallback;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 1
    ? parsed
    : fallback;
};

Sentry.init({
  dsn: dsn || undefined,
  enabled: Boolean(dsn),
  environment:
    process.env.SENTRY_ENVIRONMENT ||
    (process.env.NODE_ENV === "production" ? "production" : "development"),
  tracesSampleRate: parseRate(process.env.SENTRY_TRACES_SAMPLE_RATE, 0.05),
  sendDefaultPii: false,
  beforeSend(event) {
    scrubRequest(event);
    return event;
  },
});

function scrubRequest(event: Sentry.ErrorEvent): void {
  const req = event.request as
    | { cookies?: unknown; headers?: Record<string, unknown> }
    | undefined;
  if (!req) return;
  if (req.cookies) delete req.cookies;
  if (req.headers) {
    delete req.headers.cookie;
    delete req.headers.authorization;
    delete req.headers["set-cookie"];
  }
}
