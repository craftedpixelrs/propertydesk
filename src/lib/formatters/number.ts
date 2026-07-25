import { APP_LOCALE } from "@/lib/constants/app";

/**
 * Serbian number formatting.
 *
 * Serbian uses a comma as the decimal separator and a full stop (or
 * non-breaking space) as the thousands separator, e.g. `1.234,56`.
 * `Intl.NumberFormat` handles this correctly for the `sr-Latn` locale.
 */

export function formatNumber(
  value: number | bigint,
  options: Intl.NumberFormatOptions = {},
): string {
  const opts: Intl.NumberFormatOptions = { maximumFractionDigits: 2, ...options };
  return new Intl.NumberFormat(APP_LOCALE, opts).format(value);
}

export function formatInteger(value: number | bigint): string {
  return new Intl.NumberFormat(APP_LOCALE, { maximumFractionDigits: 0 }).format(value);
}
