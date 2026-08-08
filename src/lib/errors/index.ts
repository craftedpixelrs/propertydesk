/**
 * Extended domain error hierarchy.
 *
 * Layers above the API boundary (services, repositories) throw one of these.
 * The API `handler` wrapper (see `@/lib/api/handler`) maps them into HTTP
 * responses via the standard error envelope.
 *
 * We use two orthogonal error types:
 *   - `ApiError`     — HTTP-facing, defined in `@/lib/api/errors`
 *   - `DomainError`  — service-layer error carrying a stable code, a Serbian
 *                       user-facing message, and enough metadata for the
 *                       handler to translate it into an appropriate ApiError.
 *
 * Services should NOT import from `@/lib/api` (Next.js/response types).
 * They emit `DomainError`s only; the API layer maps them.
 */

export type DomainErrorCode =
  | "VALIDATION"
  | "NOT_FOUND"
  | "CONFLICT"
  | "OPTIMISTIC_LOCK"
  | "QUOTA_EXCEEDED"
  | "FORBIDDEN"
  | "INVALID_STATE"
  | "BAD_REQUEST"
  | "INTERNAL";

export class DomainError extends Error {
  readonly code: DomainErrorCode;
  readonly fieldErrors?: Record<string, string[]>;
  readonly context?: Record<string, unknown>;

  constructor(
    code: DomainErrorCode,
    message: string,
    options?: {
      fieldErrors?: Record<string, string[]>;
      context?: Record<string, unknown>;
      cause?: unknown;
    },
  ) {
    super(
      message,
      options?.cause instanceof Error ? { cause: options.cause } : undefined,
    );
    this.name = "DomainError";
    this.code = code;
    this.fieldErrors = options?.fieldErrors;
    this.context = options?.context;
  }
}

/** Convenience factories for the common domain errors. */
export const DomainErrors = {
  notFound: (what: string): DomainError =>
    new DomainError("NOT_FOUND", `${what} nije pronađen.`),
  conflict: (message: string): DomainError => new DomainError("CONFLICT", message),
  optimisticLock: (): DomainError =>
    new DomainError(
      "OPTIMISTIC_LOCK",
      "Podaci su izmenjeni u međuvremenu. Osvežite stranicu i pokušajte ponovo.",
    ),
  quotaExceeded: (message: string): DomainError =>
    new DomainError("QUOTA_EXCEEDED", message),
  forbidden: (message = "Nemate ovlašćenje za ovu radnju."): DomainError =>
    new DomainError("FORBIDDEN", message),
  invalidState: (message: string): DomainError =>
    new DomainError("INVALID_STATE", message),
  badRequest: (message: string): DomainError =>
    new DomainError("BAD_REQUEST", message),
  validation: (message: string, fieldErrors?: Record<string, string[]>) =>
    new DomainError("VALIDATION", message, { fieldErrors }),
};

export function isDomainError(err: unknown): err is DomainError {
  return err instanceof DomainError;
}
