import { srLatn, type Dictionary } from "./sr-Latn";

/**
 * Minimal typed translation helper.
 *
 * Design notes:
 *   - Only `sr-Latn` is enabled in V1.
 *   - The lookup key uses dot notation, e.g. `t("nav.projects")`.
 *   - Missing keys log a warning in development and return the key itself
 *     so the missing translation is visible in the UI rather than crashing.
 *   - Interpolation uses `{{name}}` placeholders — kept lightweight on
 *     purpose; upgrade to a full i18n library only when we actually add
 *     a second locale.
 */

export type Locale = "sr-Latn";
export const DEFAULT_LOCALE: Locale = "sr-Latn";

const dictionaries: Record<Locale, Dictionary> = {
  "sr-Latn": srLatn,
};

type Path<T, Prev extends string = ""> = {
  [K in keyof T & string]: T[K] extends object
    ? Path<T[K], `${Prev}${K}.`> | `${Prev}${K}`
    : `${Prev}${K}`;
}[keyof T & string];

export type TranslationKey = Path<Dictionary>;

function lookup(dict: Dictionary, key: string): string | undefined {
  const parts = key.split(".");
  let node: unknown = dict;
  for (const part of parts) {
    if (typeof node !== "object" || node === null) return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === "string" ? node : undefined;
}

export function t(
  key: TranslationKey,
  vars?: Record<string, string | number>,
  locale: Locale = DEFAULT_LOCALE,
): string {
  const dict = dictionaries[locale];
  const raw = lookup(dict, key);
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
