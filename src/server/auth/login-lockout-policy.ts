export const LOGIN_FAILS_BEFORE_LOCK = 3;
export const LOGIN_LOCK_SUSPENDED_LEVEL = 6;
export const LOGIN_LOCK_MAX_TIMED_LEVEL = 5;

/** Minutes for timed levels 1–5. Level 6 is permanent until admin unlock. */
export const LOGIN_LOCK_MINUTES = {
  1: 30,
  2: 60,
  3: 6 * 60,
  4: 12 * 60,
  5: 24 * 60,
} as const;

export type LoginLockDecision =
  | { ok: true }
  | {
      ok: false;
      kind: "locked";
      level: number;
      until: Date;
    }
  | { ok: false; kind: "suspended"; level: typeof LOGIN_LOCK_SUSPENDED_LEVEL };

export function loginLockDurationMs(level: number): number | null {
  if (level < 1 || level > LOGIN_LOCK_MAX_TIMED_LEVEL) return null;
  return LOGIN_LOCK_MINUTES[level as keyof typeof LOGIN_LOCK_MINUTES] * 60 * 1000;
}

export function nextLoginLockLevel(currentLevel: number): number {
  return Math.min(currentLevel + 1, LOGIN_LOCK_SUSPENDED_LEVEL);
}

export function isLoginCurrentlyLocked(
  level: number,
  lockedUntil: Date | null | undefined,
  now: Date = new Date(),
): boolean {
  if (level >= LOGIN_LOCK_SUSPENDED_LEVEL) return true;
  return Boolean(lockedUntil && lockedUntil.getTime() > now.getTime());
}

export const LOGIN_UNLOCK_CLEAR = {
  loginFailedAttempts: 0,
  loginLockLevel: 0,
  loginLockedUntil: null,
} as const;
