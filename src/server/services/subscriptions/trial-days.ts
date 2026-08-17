const MS_PER_DAY = 86_400_000;

/** Remaining whole days until `trialEndsAt`. `0` if already expired. `null` if never set. */
export function remainingTrialDays(
  trialEndsAt: Date | null | undefined,
  now = new Date(),
): number | null {
  if (!trialEndsAt) return null;
  return Math.max(0, Math.ceil((trialEndsAt.getTime() - now.getTime()) / MS_PER_DAY));
}

/** Original configured length from start → end. */
export function originalTrialDays(
  trialStartsAt: Date | null | undefined,
  trialEndsAt: Date | null | undefined,
): number | null {
  if (!trialStartsAt || !trialEndsAt) return null;
  return Math.max(0, Math.round((trialEndsAt.getTime() - trialStartsAt.getTime()) / MS_PER_DAY));
}

export function addDays(from: Date, days: number): Date {
  return new Date(from.getTime() + days * MS_PER_DAY);
}
