import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { APP_TIMEZONE, DATE_FORMAT, DATETIME_FORMAT } from "@/lib/constants/app";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n";

/**
 * Serbian date and date-time formatting.
 *
 *   `formatDate("2026-01-31T22:15:00Z")` -> "01.02.2026." (Europe/Belgrade)
 *   `formatDateTime("2026-01-31T22:15:00Z")` -> "01.02.2026. 23:15"
 *
 * English display uses MM/dd/yyyy (no trailing dot).
 *
 * All values are rendered in the app timezone (Europe/Belgrade by default,
 * configurable via env). The dot suffix on the Serbian date is intentional
 * and matches Serbian orthographic convention.
 */

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const ISO_DATE_TIME = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/;

function toDate(input: Date | string | number): Date {
  return input instanceof Date ? input : new Date(input);
}

export function dateInputPattern(locale: Locale): "dd.MM.yyyy" | "MM/dd/yyyy" {
  return locale === "en" ? "MM/dd/yyyy" : "dd.MM.yyyy";
}

export function dateInputPlaceholder(locale: Locale): string {
  return locale === "en" ? "MM/DD/YYYY" : "DD.MM.YYYY";
}

export function dateTimeInputPlaceholder(locale: Locale): string {
  return locale === "en" ? "MM/DD/YYYY HH:mm" : "DD.MM.YYYY HH:mm";
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function toIsoDate(year: number, month: number, day: number): string | null {
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    year < 1000 ||
    year > 9999 ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return null;
  }
  const dt = new Date(Date.UTC(year, month - 1, day));
  if (
    dt.getUTCFullYear() !== year ||
    dt.getUTCMonth() !== month - 1 ||
    dt.getUTCDate() !== day
  ) {
    return null;
  }
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

/** Format an ISO `yyyy-MM-dd` value for a date input. */
export function formatDateInputValue(isoDate: string, locale: Locale): string {
  const match = isoDate.trim().match(ISO_DATE);
  if (!match) return "";
  const [, year, month, day] = match;
  if (locale === "en") return `${month}/${day}/${year}`;
  return `${day}.${month}.${year}`;
}

/**
 * Parse a typed date into ISO `yyyy-MM-dd`.
 * Accepts ISO, the active locale pattern, and 8-digit entry.
 */
export function parseDateInputValue(text: string, locale: Locale): string | null {
  const raw = text.trim();
  if (!raw) return null;

  const iso = raw.match(ISO_DATE);
  if (iso) return toIsoDate(Number(iso[1]), Number(iso[2]), Number(iso[3]));

  const parts = raw.split(/[./-]/).map((part) => part.replace(/\D/g, "")).filter(Boolean);
  if (parts.length === 3 && parts[2]!.length === 4) {
    const a = Number(parts[0]);
    const b = Number(parts[1]);
    const year = Number(parts[2]);
    return locale === "en" ? toIsoDate(year, a, b) : toIsoDate(year, b, a);
  }
  if (parts.length === 3 && parts[0]!.length === 4) {
    return toIsoDate(Number(parts[0]), Number(parts[1]), Number(parts[2]));
  }

  const digits = raw.replace(/\D/g, "");
  if (digits.length === 8) {
    const year = Number(digits.slice(4));
    if (locale === "en") {
      return toIsoDate(year, Number(digits.slice(0, 2)), Number(digits.slice(2, 4)));
    }
    return toIsoDate(year, Number(digits.slice(2, 4)), Number(digits.slice(0, 2)));
  }

  return null;
}

/** Format `yyyy-MM-ddTHH:mm` for a datetime input. */
export function formatDateTimeInputValue(local: string, locale: Locale): string {
  const match = local.trim().match(ISO_DATE_TIME);
  if (!match) return "";
  const date = formatDateInputValue(`${match[1]}-${match[2]}-${match[3]}`, locale);
  return `${date} ${match[4]}:${match[5]}`;
}

export function parseDateTimeInputValue(text: string, locale: Locale): string | null {
  const raw = text.trim();
  if (!raw) return null;

  const iso = raw.match(ISO_DATE_TIME);
  if (iso) {
    const date = toIsoDate(Number(iso[1]), Number(iso[2]), Number(iso[3]));
    if (!date) return null;
    return `${date}T${iso[4]}:${iso[5]}`;
  }

  const timeMatch = raw.match(/(\d{1,2}):(\d{2})\s*$/);
  if (!timeMatch) return null;
  const hours = Number(timeMatch[1]);
  const minutes = Number(timeMatch[2]);
  if (hours > 23 || minutes > 59) return null;

  const datePart = raw.slice(0, timeMatch.index).trim();
  const date = parseDateInputValue(datePart, locale);
  if (!date) return null;
  return `${date}T${pad2(hours)}:${pad2(minutes)}`;
}

export function formatDate(
  input: Date | string | number,
  tz: string = APP_TIMEZONE,
  locale: Locale = DEFAULT_LOCALE,
): string {
  const pattern = locale === "en" ? "MM/dd/yyyy" : DATE_FORMAT;
  return format(toZonedTime(toDate(input), tz), pattern);
}

export function formatDateTime(
  input: Date | string | number,
  tz: string = APP_TIMEZONE,
  locale: Locale = DEFAULT_LOCALE,
): string {
  const pattern = locale === "en" ? "MM/dd/yyyy HH:mm" : DATETIME_FORMAT;
  return format(toZonedTime(toDate(input), tz), pattern);
}
