import type { ApiErrorCode } from "@/lib/api/errors";

/**
 * Error thrown by the API client when the server returns an error envelope.
 * Consumers can `instanceof` check and read `.code` for programmatic handling.
 */
export class ApiClientError extends Error {
  readonly code: ApiErrorCode | "NETWORK_ERROR" | "PARSE_ERROR";
  readonly statusCode: number;
  readonly fieldErrors?: Record<string, string[]>;
  readonly requestId?: string;

  constructor(
    code: ApiErrorCode | "NETWORK_ERROR" | "PARSE_ERROR",
    message: string,
    options: {
      statusCode?: number;
      fieldErrors?: Record<string, string[]>;
      requestId?: string;
    } = {},
  ) {
    super(message);
    this.name = "ApiClientError";
    this.code = code;
    this.statusCode = options.statusCode ?? 0;
    this.fieldErrors = options.fieldErrors;
    this.requestId = options.requestId;
  }
}
