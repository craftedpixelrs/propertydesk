import { z } from "zod";
import { ApiError } from "@/lib/api/errors";
import { messageForZodIssue, type ZodIssueLike } from "@/lib/api/zod-messages";
import { DEFAULT_LOCALE, t, type Locale } from "@/lib/i18n";

/**
 * Standard collection-query parameters supported by every list endpoint.
 *
 *   page       — 1-based page number (default 1)
 *   pageSize   — items per page (default 20, max 100)
 *   q          — free-text search string
 *   sort       — column name; prefix with `-` to reverse (e.g. `-createdAt`)
 *   filter[k]  — arbitrary equality filters, e.g. filter[status]=ACTIVE
 */

export interface ListQuery {
  page: number;
  pageSize: number;
  q?: string;
  sort?: { field: string; direction: "asc" | "desc" };
  filters: Record<string, string>;
}

export const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().max(200).optional(),
  sort: z.string().trim().max(100).optional(),
});

export function parseListQuery(
  searchParams: URLSearchParams,
  locale: Locale = DEFAULT_LOCALE,
): ListQuery {
  const parsed = listQuerySchema.safeParse({
    page: searchParams.get("page") ?? undefined,
    pageSize: searchParams.get("pageSize") ?? undefined,
    q: searchParams.get("q") ?? undefined,
    sort: searchParams.get("sort") ?? undefined,
  });

  if (!parsed.success) {
    throw new ApiError("VALIDATION_ERROR", t("validation.invalidSearch", undefined, locale), {
      fieldErrors: flattenZodIssues(parsed.error.issues, locale),
    });
  }

  const sort = parsed.data.sort
    ? parsed.data.sort.startsWith("-")
      ? { field: parsed.data.sort.slice(1), direction: "desc" as const }
      : { field: parsed.data.sort, direction: "asc" as const }
    : undefined;

  const filters: Record<string, string> = {};
  for (const [key, value] of searchParams.entries()) {
    const match = /^filter\[(.+)\]$/.exec(key);
    if (match && match[1] && value) {
      filters[match[1]] = value;
    }
  }

  return {
    page: parsed.data.page,
    pageSize: parsed.data.pageSize,
    q: parsed.data.q,
    sort,
    filters,
  };
}

export function flattenZodIssues(
  issues: readonly ZodIssueLike[],
  locale: Locale = DEFAULT_LOCALE,
): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const issue of issues) {
    const path = issue.path.map((p) => String(p)).join(".") || "_";
    if (!out[path]) out[path] = [];
    out[path].push(messageForZodIssue(issue, locale));
  }
  return out;
}

export function paginate<T>(
  items: T[],
  page: number,
  pageSize: number,
  total: number,
): { items: T[]; pagination: { page: number; pageSize: number; total: number; totalPages: number } } {
  return {
    items,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
  };
}
