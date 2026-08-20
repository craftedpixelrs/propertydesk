import { describe, expect, it } from "vitest";

import {
  LOGIN_LOCK_MAX_TIMED_LEVEL,
  LOGIN_LOCK_SUSPENDED_LEVEL,
  isLoginCurrentlyLocked,
  loginLockDurationMs,
  nextLoginLockLevel,
} from "./login-lockout-policy";

describe("login lockout policy", () => {
  it("escalates 30m → 1h → 6h → 12h → 24h → suspend", () => {
    const minutes = [30, 60, 360, 720, 1440];
    let level = 0;
    for (const expected of minutes) {
      level = nextLoginLockLevel(level);
      expect(loginLockDurationMs(level)).toBe(expected * 60 * 1000);
    }
    expect(nextLoginLockLevel(LOGIN_LOCK_MAX_TIMED_LEVEL)).toBe(
      LOGIN_LOCK_SUSPENDED_LEVEL,
    );
    expect(loginLockDurationMs(LOGIN_LOCK_SUSPENDED_LEVEL)).toBeNull();
    expect(nextLoginLockLevel(LOGIN_LOCK_SUSPENDED_LEVEL)).toBe(
      LOGIN_LOCK_SUSPENDED_LEVEL,
    );
  });

  it("treats level 6 as always locked", () => {
    expect(isLoginCurrentlyLocked(6, null)).toBe(true);
  });

  it("treats a future lockedUntil as locked", () => {
    const until = new Date(Date.now() + 60_000);
    expect(isLoginCurrentlyLocked(1, until)).toBe(true);
  });

  it("treats an expired timed lock as unlocked (ladder stays)", () => {
    const until = new Date(Date.now() - 60_000);
    expect(isLoginCurrentlyLocked(2, until)).toBe(false);
  });
});
