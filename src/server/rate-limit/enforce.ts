import "server-only";
import type { NextRequest } from "next/server";

import { ApiError } from "@/lib/api/errors";
import { rateLimit, rateLimitKey, type RateLimitOptions } from "./index";

/**
 * Enforce a rate limit inside an `apiHandler` and throw `ApiError`
 * (`RATE_LIMITED`, status 429) when the caller exceeds the bucket.
 *
 * The caller key is derived in priority order:
 *   1. Explicit `callerId` (e.g. authenticated userId or orgId), if provided.
 *   2. The first entry in `x-forwarded-for`.
 *   3. The `x-real-ip` header.
 *   4. `unknown` (still segments by scope so it isn't a global lock).
 *
 * This is intentionally simple and single-process — swap the storage
 * backend in `./index.ts` when running behind multiple app instances.
 */
export function enforceRateLimit(input: {
  req: NextRequest;
  scope: string;
  callerId?: string | null;
  options: RateLimitOptions;
}): void {
  const req = input.req;
  const explicit = input.callerId?.trim();
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const real = req.headers.get("x-real-ip")?.trim();
  const caller = explicit || forwarded || real || "unknown";

  const key = rateLimitKey(input.scope, caller);
  const result = rateLimit(key, input.options);
  if (!result.allowed) {
    throw new ApiError(
      "RATE_LIMITED",
      "Previše zahteva. Pokušajte ponovo za koji trenutak.",
      { statusCode: 429 },
    );
  }
}
