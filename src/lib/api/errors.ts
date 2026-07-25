/**
 * Machine-readable error codes exposed via the API envelope.
 *
 * Keep this list stable — the future mobile client depends on it.
 */
export type ApiErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NO_ACTIVE_ORGANIZATION"
  | "ORGANIZATION_ACCESS_DENIED"
  | "ORGANIZATION_SUSPENDED"
  | "ORGANIZATION_RESTRICTED"
  | "PLATFORM_ADMIN_REQUIRED"
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "METHOD_NOT_ALLOWED"
  | "INTERNAL_ERROR"
  | "BAD_REQUEST"
  | "NOT_IMPLEMENTED";

export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly statusCode: number;
  readonly fieldErrors?: Record<string, string[]>;

  constructor(
    code: ApiErrorCode,
    message: string,
    options?: {
      statusCode?: number;
      fieldErrors?: Record<string, string[]>;
      cause?: unknown;
    },
  ) {
    super(message, options?.cause instanceof Error ? { cause: options.cause } : undefined);
    this.name = "ApiError";
    this.code = code;
    this.statusCode = options?.statusCode ?? defaultStatusForCode(code);
    this.fieldErrors = options?.fieldErrors;
  }
}

function defaultStatusForCode(code: ApiErrorCode): number {
  switch (code) {
    case "UNAUTHENTICATED":
      return 401;
    case "FORBIDDEN":
    case "NO_ACTIVE_ORGANIZATION":
    case "ORGANIZATION_ACCESS_DENIED":
    case "ORGANIZATION_SUSPENDED":
    case "PLATFORM_ADMIN_REQUIRED":
      return 403;
    case "ORGANIZATION_RESTRICTED":
      return 402;
    case "NOT_FOUND":
      return 404;
    case "METHOD_NOT_ALLOWED":
      return 405;
    case "CONFLICT":
      return 409;
    case "VALIDATION_ERROR":
      return 422;
    case "RATE_LIMITED":
      return 429;
    case "BAD_REQUEST":
      return 400;
    case "NOT_IMPLEMENTED":
      return 501;
    case "INTERNAL_ERROR":
    default:
      return 500;
  }
}
