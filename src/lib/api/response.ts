import { NextResponse } from "next/server";
import { ApiError, type ApiErrorCode } from "@/lib/api/errors";

/**
 * Standard success envelope:
 *   { "data": ..., "meta": {...?} }
 *
 * Standard error envelope:
 *   { "error": { "code", "message", "fieldErrors?", "requestId" } }
 *
 * The `requestId` field is mandatory on every error response. It is
 * populated by `handler.ts` from the `x-request-id` header of the
 * originating request.
 */

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface SuccessMeta {
  requestId: string;
  pagination?: PaginationMeta;
  [k: string]: unknown;
}

export interface SuccessBody<T> {
  data: T;
  meta: SuccessMeta;
}

export interface ErrorBody {
  error: {
    code: ApiErrorCode;
    message: string;
    fieldErrors?: Record<string, string[]>;
    requestId: string;
  };
}

export function ok<T>(
  data: T,
  meta: Omit<SuccessMeta, "requestId"> & { requestId: string },
  init?: number | ResponseInit,
): NextResponse<SuccessBody<T>> {
  const body: SuccessBody<T> = { data, meta };
  return NextResponse.json(body, typeof init === "number" ? { status: init } : init);
}

export function fail(
  err: ApiError,
  requestId: string,
): NextResponse<ErrorBody> {
  const body: ErrorBody = {
    error: {
      code: err.code,
      message: err.message,
      fieldErrors: err.fieldErrors,
      requestId,
    },
  };
  return NextResponse.json(body, { status: err.statusCode });
}
