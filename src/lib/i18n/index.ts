import { srLatn, type Dictionary } from "./sr-Latn";
import { en } from "./en";

/**
 * Typed translation helper.
 *
 * Lookup keys use dot notation, e.g. `t("nav.projects")`.
 * Missing keys log a warning in development and return the key itself.
 * Interpolation uses `{{name}}` placeholders.
 *
 * Pass `locale` from the request / user preference. Client components
 * should use `useT()` so they follow the active I18nProvider.
 */

export type Locale = "sr-Latn" | "en";
export const DEFAULT_LOCALE: Locale = "sr-Latn";
export const SUPPORTED_LOCALES: readonly Locale[] = ["sr-Latn", "en"];
export const LOCALE_COOKIE = "pd_locale";
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

const dictionaries: Record<Locale, Dictionary> = {
  "sr-Latn": srLatn,
  en,
};

type Path<T, Prev extends string = ""> = {
  [K in keyof T & string]: T[K] extends object
    ? Path<T[K], `${Prev}${K}.`> | `${Prev}${K}`
    : `${Prev}${K}`;
}[keyof T & string];

export type TranslationKey = Path<Dictionary>;

export function isLocale(value: unknown): value is Locale {
  return value === "sr-Latn" || value === "en";
}

export function parseLocale(value: string | null | undefined): Locale | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (isLocale(trimmed)) return trimmed;
  if (trimmed === "sr" || trimmed.startsWith("sr-")) return "sr-Latn";
  if (trimmed === "en" || trimmed.startsWith("en-")) return "en";
  return null;
}

export function htmlLang(locale: Locale): string {
  return locale === "en" ? "en" : "sr-Latn";
}

export function intlLocale(locale: Locale): string {
  return locale === "en" ? "en-GB" : "sr-Latn";
}

function lookup(dict: Dictionary, key: string): string | undefined {
  const parts = key.split(".");
  let node: unknown = dict;
  for (const part of parts) {
    if (typeof node !== "object" || node === null) return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === "string" ? node : undefined;
}

export type TranslateFn = (
  key: TranslationKey,
  vars?: Record<string, string | number>,
) => string;

export function createT(locale: Locale): TranslateFn {
  return (key, vars) => t(key, vars, locale);
}

export function t(
  key: TranslationKey,
  vars?: Record<string, string | number>,
  locale: Locale = DEFAULT_LOCALE,
): string {
  const dict = dictionaries[locale] ?? dictionaries[DEFAULT_LOCALE];
  const raw = lookup(dict, key) ?? lookup(dictionaries[DEFAULT_LOCALE], key);
  if (raw === undefined) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[i18n] Missing translation for key "${key}" in locale "${locale}"`);
    }
    return key;
  }
  if (!vars) return raw;
  return raw.replace(/\{\{(\w+)\}\}/g, (_, name: string) =>
    Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : `{{${name}}}`,
  );
}

export function writeLocaleCookieValue(locale: Locale): string {
  return `${LOCALE_COOKIE}=${locale}; Path=/; Max-Age=${LOCALE_COOKIE_MAX_AGE}; SameSite=Lax`;
}

/** Read `pd_locale` from a Cookie header or `document.cookie` string. */
export function localeFromCookieString(cookieHeader: string | undefined | null): Locale | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${LOCALE_COOKIE}=([^;]*)`));
  return parseLocale(match?.[1] ? decodeURIComponent(match[1]) : null);
}

/**
 * Locale for an incoming HTTP request: `x-pd-locale` header, then cookie,
 * then `Accept-Language`, then Serbian.
 */
export function localeFromRequest(req: {
  headers: { get(name: string): string | null };
  cookies: { get(name: string): { value: string } | undefined };
}): Locale {
  const fromHeader = parseLocale(req.headers.get("x-pd-locale"));
  if (fromHeader) return fromHeader;

  const fromCookie = parseLocale(req.cookies.get(LOCALE_COOKIE)?.value);
  if (fromCookie) return fromCookie;

  const accept = req.headers.get("accept-language");
  if (accept) {
    for (const part of accept.split(",")) {
      const tag = part.split(";")[0]?.trim();
      const parsed = parseLocale(tag);
      if (parsed) return parsed;
    }
  }

  return DEFAULT_LOCALE;
}

function lookupLabel(key: TranslationKey, localeOrT: Locale | TranslateFn): string {
  const out =
    typeof localeOrT === "function" ? localeOrT(key) : t(key, undefined, localeOrT);
  return out === key ? key.split(".").pop() ?? key : out;
}

export function unitStatusLabel(
  status: string,
  localeOrT: Locale | TranslateFn = DEFAULT_LOCALE,
): string {
  return lookupLabel(`units.status.${status}` as TranslationKey, localeOrT);
}

export function projectStatusLabel(
  status: string,
  localeOrT: Locale | TranslateFn = DEFAULT_LOCALE,
): string {
  return lookupLabel(`projects.status.${status}` as TranslationKey, localeOrT);
}

export function unitTypeLabel(
  type: string,
  localeOrT: Locale | TranslateFn = DEFAULT_LOCALE,
): string {
  return lookupLabel(`units.type.${type}` as TranslationKey, localeOrT);
}

export function enumLabel(
  group: "reservation" | "sale" | "buyer" | "registration" | "shareLink",
  value: string,
  localeOrT: Locale | TranslateFn = DEFAULT_LOCALE,
): string {
  const key = `enums.${group}.${value}` as TranslationKey;
  const out =
    typeof localeOrT === "function" ? localeOrT(key) : t(key, undefined, localeOrT);
  return out === key ? value : out;
}
