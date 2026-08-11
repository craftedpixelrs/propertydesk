import * as Sentry from "@sentry/nextjs";

import { serverEnv } from "@/lib/env";
import { logger } from "@/server/logger";

/**
 * Monitoring facade backed by `@sentry/nextjs`.
 *
 * The public API (`captureException`, `captureMessage`, `setUserContext`,
 * `clearUserContext`) is intentionally unchanged from the pre-SDK
 * facade so existing call sites (e.g. `apiHandler`) don't need to be
 * touched. All heavy lifting - transports, retries, breadcrumbs,
 * source-map symbolication - is now delegated to Sentry.
 *
 * Rules of the facade:
 *   1. Always log to our structured logger first so operators can grep
 *      production output even when Sentry is disabled or the network is
 *      down.
 *   2. Skip the SDK entirely when `SENTRY_DSN` is not configured so
 *      preview / dev environments don't emit noise (Sentry defaults to a
 *      no-op init in that case, but calling `captureException()` on it
 *      still allocates a lot of context).
 */

interface CaptureContext {
  requestId?: string;
  userId?: string;
  organizationId?: string;
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
}

const sentryEnabled = Boolean(serverEnv.SENTRY_DSN);

export function captureException(err: unknown, ctx: CaptureContext = {}): void {
  const error = normalizeError(err);
  logger.error("monitoring.exception", {
    message: error.message,
    name: error.name,
    stack: error.stack,
    ...ctx,
  });
  if (!sentryEnabled) return;
  try {
    Sentry.withScope((scope) => {
      applyScope(scope, ctx);
      Sentry.captureException(error);
    });
  } catch {
    // Never let monitoring fail a request.
  }
}

export function captureMessage(
  message: string,
  level: "info" | "warning" | "error" = "info",
  ctx: CaptureContext = {},
): void {
  logger.info("monitoring.message", { message, level, ...ctx });
  if (!sentryEnabled) return;
  try {
    Sentry.withScope((scope) => {
      applyScope(scope, ctx);
      Sentry.captureMessage(message, level);
    });
  } catch {
    // Never let monitoring fail a request.
  }
}

/**
 * Attach a user context to the current Sentry scope. Useful from
 * middleware / server actions where we already have the authenticated
 * user. Silent no-op when Sentry is disabled.
 */
export function setUserContext(user: {
  id: string;
  email?: string | null;
  organizationId?: string | null;
}): void {
  if (!sentryEnabled) return;
  try {
    Sentry.setUser({
      id: user.id,
      email: user.email ?? undefined,
      // Sentry accepts arbitrary keys on the user object.
      ...(user.organizationId
        ? { organization_id: user.organizationId }
        : {}),
    });
  } catch {
    // Ignore.
  }
}

export function clearUserContext(): void {
  if (!sentryEnabled) return;
  try {
    Sentry.setUser(null);
  } catch {
    // Ignore.
  }
}

function normalizeError(err: unknown): Error {
  if (err instanceof Error) return err;
  const e = new Error(typeof err === "string" ? err : JSON.stringify(err));
  e.name = "NonErrorThrowable";
  return e;
}

function applyScope(scope: Sentry.Scope, ctx: CaptureContext): void {
  if (ctx.requestId) scope.setTag("request_id", ctx.requestId);
  if (ctx.userId || ctx.organizationId) {
    scope.setUser({
      id: ctx.userId,
      ...(ctx.organizationId ? { organization_id: ctx.organizationId } : {}),
    });
  }
  if (ctx.tags) {
    for (const [key, value] of Object.entries(ctx.tags)) {
      scope.setTag(key, value);
    }
  }
  if (ctx.extra) {
    for (const [key, value] of Object.entries(ctx.extra)) {
      scope.setExtra(key, value);
    }
  }
}
