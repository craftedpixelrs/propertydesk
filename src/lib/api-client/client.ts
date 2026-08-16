import { ApiClientError } from "@/lib/api-client/errors";
import { localizeFieldErrors, localizeZodMessage } from "@/lib/api/zod-messages";
import {
  DEFAULT_LOCALE,
  localeFromCookieString,
  type Locale,
} from "@/lib/i18n";

/**
 * Typed fetch client for the PropertyDesk REST API.
 *
 * Design goals:
 *   - Same client works in the browser AND in a future React Native app
 *     (no browser-only globals in the transport itself).
 *   - Always returns unwrapped `data` on success.
 *   - Always throws `ApiClientError` on failure — no double return-value juggling.
 *   - Envelope-agnostic at the call site: consumers see plain typed data.
 */

export interface ApiClientOptions {
  baseUrl: string;
  /** Optional bearer/session token injector (mostly for the mobile app). */
  getAuthToken?: () => Promise<string | null> | string | null;
  /** Override `fetch` (used in tests). */
  fetchFn?: typeof fetch;
  /** Default request timeout in ms. */
  timeoutMs?: number;
}

export interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  query?: Record<string, string | number | boolean | null | undefined>;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

interface SuccessBody<T> {
  data: T;
  meta?: { requestId: string; [k: string]: unknown };
}

interface ErrorBody {
  error: {
    code: string;
    message: string;
    fieldErrors?: Record<string, string[]>;
    requestId: string;
  };
}

export class ApiClient {
  private readonly baseUrl: string;
  private readonly getAuthToken?: ApiClientOptions["getAuthToken"];
  private readonly fetchFn: typeof fetch;
  private readonly timeoutMs: number;

  constructor(options: ApiClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    this.getAuthToken = options.getAuthToken;
    // Rebind fetch to its owning realm. Calling the global `fetch` as a
    // method on some other object (e.g. `this.fetchFn(...)`) makes browsers
    // throw `TypeError: 'fetch' called on an object that does not implement
    // interface Window`. Binding once here is the fix.
    const providedFetch = options.fetchFn ?? fetch;
    this.fetchFn = providedFetch.bind(globalThis) as typeof fetch;
    this.timeoutMs = options.timeoutMs ?? 20_000;
  }

  async request<T = unknown>(path: string, opts: RequestOptions = {}): Promise<T> {
    const url = this.buildUrl(path, opts.query);

    const locale = readClientLocale();
    const headers: Record<string, string> = {
      accept: "application/json",
      "x-pd-locale": locale,
      ...opts.headers,
    };

    if (opts.body !== undefined) {
      headers["content-type"] ??= "application/json";
    }

    if (this.getAuthToken) {
      const token = await Promise.resolve(this.getAuthToken());
      if (token) headers.authorization ??= `Bearer ${token}`;
    }

    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => controller.abort(), this.timeoutMs);
    const signal = mergeSignals(controller.signal, opts.signal);

    let res: Response;
    try {
      res = await this.fetchFn(url, {
        method: opts.method ?? "GET",
        headers,
        body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
        signal,
        credentials: "include",
      });
    } catch (err) {
      clearTimeout(timeoutHandle);
      const isAbort = err instanceof DOMException && err.name === "AbortError";
      const message = isAbort
        ? "Zahtev je prekinut."
        : "Greška u komunikaciji sa serverom.";
      if (!isAbort && typeof window !== "undefined") {
        // Surface the real underlying cause in the browser console so
        // dev-time NETWORK_ERROR failures are not silent.
         
        console.error("[apiClient] fetch failed", { url, method: opts.method, err });
      }
      throw new ApiClientError("NETWORK_ERROR", message);
    } finally {
      clearTimeout(timeoutHandle);
    }

    const requestId = res.headers.get("x-request-id") ?? undefined;
    const text = await res.text();
    let parsed: unknown = null;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      throw new ApiClientError("PARSE_ERROR", "Odgovor servera nije ispravan.", {
        statusCode: res.status,
        requestId,
      });
    }

    if (!res.ok) {
      const errBody = (parsed as ErrorBody | null)?.error;
      throw new ApiClientError(
        (errBody?.code ?? "INTERNAL_ERROR") as ApiClientError["code"],
        errBody?.message
          ? localizeZodMessage(errBody.message, locale)
          : "Greška u komunikaciji sa serverom.",
        {
          statusCode: res.status,
          fieldErrors: localizeFieldErrors(errBody?.fieldErrors, locale),
          requestId: errBody?.requestId ?? requestId,
        },
      );
    }

    if (res.status === 204 || parsed == null) {
      return undefined as T;
    }

    return (parsed as SuccessBody<T>).data;
  }

  get<T>(path: string, opts?: Omit<RequestOptions, "method" | "body">) {
    return this.request<T>(path, { ...opts, method: "GET" });
  }
  post<T>(path: string, body?: unknown, opts?: Omit<RequestOptions, "method">) {
    return this.request<T>(path, { ...opts, method: "POST", body });
  }
  patch<T>(path: string, body?: unknown, opts?: Omit<RequestOptions, "method">) {
    return this.request<T>(path, { ...opts, method: "PATCH", body });
  }
  put<T>(path: string, body?: unknown, opts?: Omit<RequestOptions, "method">) {
    return this.request<T>(path, { ...opts, method: "PUT", body });
  }
  delete<T>(path: string, opts?: Omit<RequestOptions, "method" | "body">) {
    return this.request<T>(path, { ...opts, method: "DELETE" });
  }

  private buildUrl(path: string, query?: RequestOptions["query"]): string {
    // Callers must pass paths relative to `/api/v1` (e.g. `/buyers`). If a
    // full `/api/v1/...` path is passed anyway, strip the duplicate prefix
    // so we don't 404 on `/api/v1/api/v1/...` and return HTML.
    let relative = path;
    if (!path.startsWith("http") && this.baseUrl.endsWith("/api/v1")) {
      if (relative.startsWith("/api/v1/")) relative = relative.slice("/api/v1".length);
      else if (relative === "/api/v1") relative = "/";
    }
    const base = path.startsWith("http")
      ? path
      : `${this.baseUrl}${relative.startsWith("/") ? "" : "/"}${relative}`;
    if (!query) return base;
    const searchParams = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null || v === "") continue;
      searchParams.append(k, String(v));
    }
    const qs = searchParams.toString();
    return qs ? `${base}${base.includes("?") ? "&" : "?"}${qs}` : base;
  }
}

function readClientLocale(): Locale {
  if (typeof document === "undefined") return DEFAULT_LOCALE;
  return localeFromCookieString(document.cookie) ?? DEFAULT_LOCALE;
}

function mergeSignals(
  primary: AbortSignal,
  extra?: AbortSignal,
): AbortSignal {
  if (!extra) return primary;
  const merged = new AbortController();
  const onAbort = () => merged.abort();
  primary.addEventListener("abort", onAbort);
  extra.addEventListener("abort", onAbort);
  return merged.signal;
}
