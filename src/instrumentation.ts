/**
 * Next.js instrumentation hook. Loaded once per runtime at startup
 * (Node server and edge runtime respectively). We wire Sentry here
 * because Next 16 removed automatic discovery of `sentry.server.config`
 * from the project root - the recommended path is to import them from
 * `register()`.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}

export { captureRequestError as onRequestError } from "@sentry/nextjs";
