const APP_TIME_ZONE = "Europe/Belgrade";
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Calendar date in Europe/Belgrade, `YYYY-MM-DD`. */
export function belgradeDateString(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function timeZoneOffsetMs(at: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(at);
  const pick = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);
  const asUtc = Date.UTC(
    pick("year"),
    pick("month") - 1,
    pick("day"),
    pick("hour"),
    pick("minute"),
    pick("second"),
  );
  return asUtc - at.getTime();
}

/**
 * Midnight at the start of `YYYY-MM-DD` in Europe/Belgrade.
 * Returns null when the string is not that calendar day.
 */
export function belgradeStartOfDay(isoDate: string): Date | null {
  const match = DATE_RE.exec(isoDate);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < 2020 || year > 2040 || month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }
  const utcMidnight = Date.UTC(year, month - 1, day, 0, 0, 0);
  const corrected = new Date(utcMidnight - timeZoneOffsetMs(new Date(utcMidnight)));
  const start = new Date(utcMidnight - timeZoneOffsetMs(corrected));
  if (belgradeDateString(start) !== isoDate) return null;
  return start;
}

/** True while `now` is strictly before the activation instant. */
export function isBeforeActivation(
  activatesAt: Date | null | undefined,
  now = new Date(),
): boolean {
  if (!activatesAt) return false;
  return activatesAt.getTime() > now.getTime();
}
