import { NextResponse, type NextRequest } from "next/server";
import { ZodError, type ZodType } from "zod";
import { randomUUID } from "node:crypto";

import { ApiError, type ApiErrorCode } from "@/lib/api/errors";
import { fail, ok, type SuccessMeta } from "@/lib/api/response";
import { flattenZodIssues, parseListQuery, type ListQuery } from "@/lib/api/query";
import { AuthError } from "@/server/auth/session";
import { DomainError } from "@/lib/errors";

/**
 * Wrapper around a Next.js Route Handler that:
 *   1. Assigns / propagates an `x-request-id` for correlation.
 *   2. Optionally validates the request body against a Zod schema.
 *   3. Standardises success responses (`{ data, meta }`).
 *   4. Converts thrown `ApiError` / `AuthError` / `DomainError` / `ZodError`
 *      into the error envelope with a Serbian message and appropriate HTTP
 *      status.
 *   5. Logs unexpected errors before returning a generic 500 to the client.
 */

export interface HandlerContext<TBody, TParams> {
  req: NextRequest;
  requestId: string;
  body: TBody;
  params: TParams;
  query: ListQuery;
  searchParams: URLSearchParams;
}

interface HandlerOptions<TBody, TParams> {
  bodySchema?: ZodType<TBody>;
  paramsSchema?: ZodType<TParams>;
}

type HandlerResult =
  | Response
  | { data: unknown; meta?: Omit<SuccessMeta, "requestId">; status?: number };

export function apiHandler<TBody = unknown, TParams = Record<string, string>>(
  options: HandlerOptions<TBody, TParams>,
  fn: (ctx: HandlerContext<TBody, TParams>) => Promise<HandlerResult>,
) {
  return async (
    req: NextRequest,
    routeArgs: { params: Promise<TParams> } | { params: TParams } | undefined,
  ): Promise<Response> => {
    const requestId = req.headers.get("x-request-id") ?? randomUUID();

    try {
      const searchParams = req.nextUrl.searchParams;
      const query = parseListQuery(searchParams);

      const rawParams = routeArgs
        ? await Promise.resolve((routeArgs as { params: Promise<TParams> | TParams }).params)
        : ({} as TParams);
      const params = options.paramsSchema
        ? options.paramsSchema.parse(rawParams)
        : (rawParams as TParams);

      let body: TBody = undefined as unknown as TBody;
      if (options.bodySchema && req.method !== "GET" && req.method !== "DELETE") {
        const contentType = req.headers.get("content-type") ?? "";
        const raw = contentType.includes("application/json")
          ? await req.json().catch(() => ({}))
          : {};
        body = options.bodySchema.parse(raw);
      }

      const result = await fn({
        req,
        requestId,
        body,
        params,
        query,
        searchParams,
      });

      if (result instanceof Response) {
        if (!result.headers.get("x-request-id")) {
          result.headers.set("x-request-id", requestId);
        }
        return result;
      }

      const response = ok(
        result.data,
        { ...(result.meta ?? {}), requestId },
        result.status,
      );
      response.headers.set("x-request-id", requestId);
      return response;
    } catch (err) {
      const apiErr = toApiError(err);
      if (apiErr.statusCode >= 500) {
        console.error(`[api] ${req.method} ${req.nextUrl.pathname} [${requestId}]`, err);
        // Fire-and-forget forward to monitoring facade (Sentry when
        // configured). Dynamic import keeps `apiHandler` free of the
        // monitoring module unless a 5xx actually occurs.
        void import("@/server/monitoring").then(({ captureException }) => {
          captureException(err, {
            requestId,
            tags: { route: req.nextUrl.pathname, method: req.method },
          });
        });
      }
      const response = fail(apiErr, requestId);
      response.headers.set("x-request-id", requestId);
      return response;
    }
  };
}

function toApiError(err: unknown): ApiError {
  if (err instanceof ApiError) return err;
  if (err instanceof ZodError) {
    return new ApiError("VALIDATION_ERROR", "Podaci nisu ispravni.", {
      fieldErrors: flattenZodIssues(err.issues),
    });
  }
  if (err instanceof AuthError) {
    const map: Record<
      typeof err.code,
      { code: ApiErrorCode; status: number }
    > = {
      UNAUTHENTICATED: { code: "UNAUTHENTICATED", status: 401 },
      FORBIDDEN: { code: "FORBIDDEN", status: 403 },
      NO_ACTIVE_ORGANIZATION: { code: "NO_ACTIVE_ORGANIZATION", status: 403 },
      ORGANIZATION_ACCESS_DENIED: { code: "ORGANIZATION_ACCESS_DENIED", status: 403 },
      ORGANIZATION_SUSPENDED: { code: "ORGANIZATION_SUSPENDED", status: 403 },
      ORGANIZATION_RESTRICTED: { code: "ORGANIZATION_RESTRICTED", status: 402 },
      PLATFORM_ADMIN_REQUIRED: { code: "PLATFORM_ADMIN_REQUIRED", status: 403 },
    };
    const mapped = map[err.code];
    return new ApiError(mapped.code, err.message, { statusCode: mapped.status });
  }
  if (err instanceof DomainError) {
    const map: Record<
      typeof err.code,
      { code: ApiErrorCode; status: number }
    > = {
      VALIDATION: { code: "VALIDATION_ERROR", status: 422 },
      NOT_FOUND: { code: "NOT_FOUND", status: 404 },
      CONFLICT: { code: "CONFLICT", status: 409 },
      OPTIMISTIC_LOCK: { code: "CONFLICT", status: 409 },
      QUOTA_EXCEEDED: { code: "CONFLICT", status: 409 },
      FORBIDDEN: { code: "FORBIDDEN", status: 403 },
      INVALID_STATE: { code: "CONFLICT", status: 409 },
      BAD_REQUEST: { code: "BAD_REQUEST", status: 400 },
      INTERNAL: { code: "INTERNAL_ERROR", status: 500 },
    };
    const mapped = map[err.code];
    return new ApiError(mapped.code, err.message, {
      statusCode: mapped.status,
      fieldErrors: err.fieldErrors,
    });
  }
  console.error("[api] Unexpected error", err);
  return new ApiError("INTERNAL_ERROR", "Došlo je do neočekivane greške.");
}

/**
 * Convenience: reject unsupported HTTP methods with a proper envelope.
 */
export function methodNotAllowed(requestId: string = randomUUID()): Response {
  return fail(
    new ApiError("METHOD_NOT_ALLOWED", "Ova metoda nije podržana."),
    requestId,
  );
}

export type { HandlerResult };
export { ok, fail } from "@/lib/api/response";
export { NextResponse };
