/**
 * In-memory sliding-window rate limiter.
 *
 * Adequate for single-instance deployments (self-hosted VPS with one Node
 * process behind nginx, or Docker Compose). For multi-instance production
 * setups, swap the storage layer for Redis without changing the call sites.
 *
 * Application layer used only for endpoints that Better Auth's own limiter
 * does not cover (impersonation, invitations, import jobs, ...). For auth
 * endpoints, Better Auth's built-in limiter runs first.
 */

import { serverEnv } from "@/lib/env";

interface Bucket {
  windowStart: number;
  count: number;
}

const store = new Map<string, Bucket>();

const DEFAULT_WINDOW_MS = 60_000;

export interface RateLimitOptions {
  /** Sliding window size in milliseconds. Default: 60_000 (1 minute). */
  windowMs?: number;
  /** Maximum number of hits per key inside the window. */
  max: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Consume one unit against the bucket identified by `key`.
 * If rate limiting is disabled via env, always returns `{ allowed: true }`.
 */
export function rateLimit(
  key: string,
  options: RateLimitOptions,
): RateLimitResult {
  if (!serverEnv.RATE_LIMIT_ENABLED) {
    return { allowed: true, remaining: options.max, resetAt: Date.now() };
  }

  const windowMs = options.windowMs ?? DEFAULT_WINDOW_MS;
  const now = Date.now();
  const bucket = store.get(key);

  if (!bucket || now - bucket.windowStart >= windowMs) {
    store.set(key, { windowStart: now, count: 1 });
    return {
      allowed: true,
      remaining: options.max - 1,
      resetAt: now + windowMs,
    };
  }

  bucket.count += 1;
  const remaining = Math.max(0, options.max - bucket.count);
  return {
    allowed: bucket.count <= options.max,
    remaining,
    resetAt: bucket.windowStart + windowMs,
  };
}

/**
 * Compose a bucket key from a route name and a caller identifier
 * (user id when authenticated, IP address otherwise).
 */
export function rateLimitKey(scope: string, caller: string): string {
  return `${scope}::${caller}`;
}

/**
 * Reset a bucket (test helper).
 */
export function resetRateLimit(key: string): void {
  store.delete(key);
}
