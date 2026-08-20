import { prisma } from "@/server/db/prisma";
import { recordAudit } from "@/server/audit/audit";
import { localeFromCookieString, t, DEFAULT_LOCALE, type Locale } from "@/lib/i18n";
import { formatDateTime } from "@/lib/formatters/date";
import {
  LOGIN_FAILS_BEFORE_LOCK,
  LOGIN_LOCK_SUSPENDED_LEVEL,
  LOGIN_UNLOCK_CLEAR,
  loginLockDurationMs,
  nextLoginLockLevel,
  type LoginLockDecision,
} from "@/server/auth/login-lockout-policy";

export {
  LOGIN_FAILS_BEFORE_LOCK,
  LOGIN_LOCK_MAX_TIMED_LEVEL,
  LOGIN_LOCK_MINUTES,
  LOGIN_LOCK_SUSPENDED_LEVEL,
  LOGIN_UNLOCK_CLEAR,
  isLoginCurrentlyLocked,
  loginLockDurationMs,
  nextLoginLockLevel,
  type LoginLockDecision,
} from "@/server/auth/login-lockout-policy";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

async function findUserByEmail(email: string) {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;
  return prisma.user.findFirst({
    where: { email: { equals: normalized, mode: "insensitive" } },
    select: {
      id: true,
      email: true,
      loginFailedAttempts: true,
      loginLockLevel: true,
      loginLockedUntil: true,
    },
  });
}

export async function assertCanSignIn(email: string): Promise<LoginLockDecision> {
  const user = await findUserByEmail(email);
  if (!user) return { ok: true };
  if (user.loginLockLevel >= LOGIN_LOCK_SUSPENDED_LEVEL) {
    return { ok: false, kind: "suspended", level: LOGIN_LOCK_SUSPENDED_LEVEL };
  }
  if (user.loginLockedUntil && user.loginLockedUntil.getTime() > Date.now()) {
    return {
      ok: false,
      kind: "locked",
      level: user.loginLockLevel,
      until: user.loginLockedUntil,
    };
  }
  return { ok: true };
}

export async function recordSuccessfulSignIn(email: string): Promise<void> {
  const user = await findUserByEmail(email);
  if (!user) return;
  if (
    user.loginFailedAttempts === 0 &&
    user.loginLockLevel === 0 &&
    user.loginLockedUntil == null
  ) {
    return;
  }
  await prisma.user.update({
    where: { id: user.id },
    data: {
      loginFailedAttempts: 0,
      loginLockLevel: 0,
      loginLockedUntil: null,
    },
  });
}

export async function recordFailedSignIn(email: string): Promise<{
  found: boolean;
  decision: LoginLockDecision;
  remaining: number;
}> {
  const user = await findUserByEmail(email);
  if (!user) {
    return { found: false, decision: { ok: true }, remaining: LOGIN_FAILS_BEFORE_LOCK };
  }

  if (user.loginLockLevel >= LOGIN_LOCK_SUSPENDED_LEVEL) {
    return {
      found: true,
      decision: { ok: false, kind: "suspended", level: LOGIN_LOCK_SUSPENDED_LEVEL },
      remaining: 0,
    };
  }
  if (user.loginLockedUntil && user.loginLockedUntil.getTime() > Date.now()) {
    return {
      found: true,
      decision: {
        ok: false,
        kind: "locked",
        level: user.loginLockLevel,
        until: user.loginLockedUntil,
      },
      remaining: 0,
    };
  }

  const attempts = user.loginFailedAttempts + 1;
  if (attempts < LOGIN_FAILS_BEFORE_LOCK) {
    await prisma.user.update({
      where: { id: user.id },
      data: { loginFailedAttempts: attempts },
    });
    return {
      found: true,
      decision: { ok: true },
      remaining: LOGIN_FAILS_BEFORE_LOCK - attempts,
    };
  }

  const level = nextLoginLockLevel(user.loginLockLevel);
  const durationMs = loginLockDurationMs(level);
  const until = durationMs ? new Date(Date.now() + durationMs) : null;

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: {
        loginFailedAttempts: 0,
        loginLockLevel: level,
        loginLockedUntil: until,
      },
    }),
    prisma.session.deleteMany({ where: { userId: user.id } }),
  ]);

  await recordAudit({
    action:
      level >= LOGIN_LOCK_SUSPENDED_LEVEL
        ? "auth.account_suspended"
        : "auth.account_locked",
    entityType: "User",
    entityId: user.id,
    metadata: {
      email: user.email,
      level,
      lockedUntil: until?.toISOString() ?? null,
    },
  });

  if (level >= LOGIN_LOCK_SUSPENDED_LEVEL) {
    return {
      found: true,
      decision: { ok: false, kind: "suspended", level: LOGIN_LOCK_SUSPENDED_LEVEL },
      remaining: 0,
    };
  }

  return {
    found: true,
    decision: { ok: false, kind: "locked", level, until: until! },
    remaining: 0,
  };
}

export async function unlockLoginByAdmin(
  userId: string,
  actorUserId: string,
): Promise<{ unlocked: boolean }> {
  const existing = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      loginFailedAttempts: true,
      loginLockLevel: true,
      loginLockedUntil: true,
    },
  });
  if (!existing) return { unlocked: false };

  const wasLocked =
    existing.loginLockLevel > 0 ||
    existing.loginFailedAttempts > 0 ||
    existing.loginLockedUntil != null;

  await prisma.user.update({
    where: { id: userId },
    data: { ...LOGIN_UNLOCK_CLEAR },
  });

  if (wasLocked) {
    await recordAudit({
      action: "auth.account_unlocked",
      entityType: "User",
      entityId: userId,
      actorUserId,
      previousValues: {
        loginLockLevel: existing.loginLockLevel,
        loginLockedUntil: existing.loginLockedUntil,
        loginFailedAttempts: existing.loginFailedAttempts,
      },
      newValues: { ...LOGIN_UNLOCK_CLEAR },
      metadata: { email: existing.email },
    });
  }

  return { unlocked: wasLocked };
}

export function localeFromRequest(request: Request): Locale {
  return localeFromCookieString(request.headers.get("cookie")) ?? DEFAULT_LOCALE;
}

export function loginLockMessage(
  locale: Locale,
  decision: Extract<LoginLockDecision, { ok: false }>,
): string {
  if (decision.kind === "suspended") {
    return t("auth.loginSuspended", undefined, locale);
  }
  const durationKey = {
    1: "auth.loginLockDuration.l1",
    2: "auth.loginLockDuration.l2",
    3: "auth.loginLockDuration.l3",
    4: "auth.loginLockDuration.l4",
    5: "auth.loginLockDuration.l5",
  } as const;
  const duration =
    decision.level in durationKey
      ? t(durationKey[decision.level as keyof typeof durationKey], undefined, locale)
      : String(decision.level);
  return t(
    "auth.loginLocked",
    {
      until: formatDateTime(decision.until, undefined, locale),
      duration,
    },
    locale,
  );
}

export function loginFailedRemainingMessage(locale: Locale, remaining: number): string {
  return t("auth.loginFailedRemaining", { remaining }, locale);
}

export function loginLockHttpPayload(
  locale: Locale,
  decision: Extract<LoginLockDecision, { ok: false }>,
): { status: 403; body: { message: string; code: string } } {
  return {
    status: 403,
    body: {
      message: loginLockMessage(locale, decision),
      code: decision.kind === "suspended" ? "LOGIN_SUSPENDED" : "LOGIN_LOCKED",
    },
  };
}
