import { serverEnv } from "@/lib/env";
import { logger } from "@/server/logger";

/**
 * Lightweight monitoring facade.
 *
 * The full Sentry SDK adds ~120kB to the server bundle and introduces
 * additional peer-dependency friction that we don't yet need. Instead we
 * expose a small `captureException` / `captureMessage` surface that:
 *
 *   1. Always logs structurally so operators can grep production logs.
 *   2. When `SENTRY_DSN` is configured, POSTs a minimal Sentry-compatible
 *      envelope to the DSN's `store` endpoint. This is fire-and-forget
 *      and never awaits (never blocks a request).
 *
 * When the app later graduates to the full SDK, only this module changes.
 */

interface CaptureContext {
  requestId?: string;
  userId?: string;
  organizationId?: string;
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
}

export function captureException(err: unknown, ctx: CaptureContext = {}): void {
  const error = normalizeError(err);
  logger.error("monitoring.exception", {
    message: error.message,
    name: error.name,
    stack: error.stack,
    ...ctx,
  });
  if (!serverEnv.SENTRY_DSN) return;
  void forwardToSentry("error", error.message, error, ctx);
}

export function captureMessage(
  message: string,
  level: "info" | "warning" | "error" = "info",
  ctx: CaptureContext = {},
): void {
  logger.info("monitoring.message", { message, level, ...ctx });
  if (!serverEnv.SENTRY_DSN) return;
  void forwardToSentry(level, message, null, ctx);
}

function normalizeError(err: unknown): Error {
  if (err instanceof Error) return err;
  const e = new Error(typeof err === "string" ? err : JSON.stringify(err));
  e.name = "NonErrorThrowable";
  return e;
}

/**
 * Extremely small Sentry ingestion. Uses the classic DSN URL format:
 * `https://<publicKey>@<host>/<projectId>` → posts JSON to
 * `https://<host>/api/<projectId>/store/`.
 *
 * We deliberately do not batch, retry, or transform stack traces. A real
 * agent should replace this with `@sentry/nextjs` when the app grows.
 */
async function forwardToSentry(
  level: "info" | "warning" | "error",
  message: string,
  error: Error | null,
  ctx: CaptureContext,
): Promise<void> {
  const dsn = serverEnv.SENTRY_DSN;
  if (!dsn) return;
  try {
    const parsed = parseDsn(dsn);
    if (!parsed) return;
    const payload = {
      event_id: crypto.randomUUID().replace(/-/g, ""),
      timestamp: new Date().toISOString(),
      platform: "javascript",
      level,
      logger: "propertydesk",
      environment: process.env.NODE_ENV ?? "development",
      message,
      exception: error
        ? {
            values: [
              {
                type: error.name,
                value: error.message,
                stacktrace: error.stack ? { frames: parseStack(error.stack) } : undefined,
              },
            ],
          }
        : undefined,
      tags: ctx.tags,
      user:
        ctx.userId || ctx.organizationId
          ? { id: ctx.userId, organization_id: ctx.organizationId }
          : undefined,
      extra: ctx.extra,
      request: ctx.requestId ? { headers: { "x-request-id": ctx.requestId } } : undefined,
    };
    const url = `${parsed.protocol}//${parsed.host}/api/${parsed.projectId}/store/`;
    const authHeader = [
      "Sentry sentry_version=7",
      `sentry_client=propertydesk-facade/1.0`,
      `sentry_timestamp=${Math.floor(Date.now() / 1000)}`,
      `sentry_key=${parsed.publicKey}`,
    ].join(", ");
    await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Sentry-Auth": authHeader,
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    }).catch(() => undefined);
  } catch {
    // Never let monitoring fail a request.
  }
}

interface ParsedDsn {
  protocol: string;
  publicKey: string;
  host: string;
  projectId: string;
}

function parseDsn(dsn: string): ParsedDsn | null {
  try {
    const u = new URL(dsn);
    const projectId = u.pathname.replace(/^\//, "");
    if (!u.username || !projectId) return null;
    return {
      protocol: u.protocol,
      publicKey: u.username,
      host: u.host,
      projectId,
    };
  } catch {
    return null;
  }
}

interface StackFrame {
  filename: string;
  function: string;
  lineno?: number;
}

function parseStack(stack: string): StackFrame[] {
  const frames: StackFrame[] = [];
  const lines = stack.split("\n").slice(1, 21);
  for (const line of lines) {
    const match = /at\s+(?:(.+?)\s+\()?(.+?):(\d+):\d+\)?$/.exec(line.trim());
    if (!match) continue;
    frames.push({
      function: match[1] ?? "?",
      filename: match[2] ?? "?",
      lineno: match[3] ? Number(match[3]) : undefined,
    });
  }
  return frames;
}
