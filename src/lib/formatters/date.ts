import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { APP_TIMEZONE, DATE_FORMAT, DATETIME_FORMAT } from "@/lib/constants/app";

/**
 * Serbian date and date-time formatting.
 *
 *   `formatDate("2026-01-31T22:15:00Z")` -> "01.02.2026." (Europe/Belgrade)
 *   `formatDateTime("2026-01-31T22:15:00Z")` -> "01.02.2026. 23:15"
 *
 * All values are rendered in the app timezone (Europe/Belgrade by default,
 * configurable via env). The dot suffix on the date is intentional and
 * matches Serbian orthographic convention.
 */

function toDate(input: Date | string | number): Date {
  return input instanceof Date ? input : new Date(input);
}

export function formatDate(input: Date | string | number, tz: string = APP_TIMEZONE): string {
  return format(toZonedTime(toDate(input), tz), DATE_FORMAT);
}

export function formatDateTime(
  input: Date | string | number,
  tz: string = APP_TIMEZONE,
): string {
  return format(toZonedTime(toDate(input), tz), DATETIME_FORMAT);
}
