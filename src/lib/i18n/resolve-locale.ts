import "server-only";

import { cookies } from "next/headers";

import { prisma } from "@/server/db/prisma";
import { getSession } from "@/server/auth/session";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  parseLocale,
  type Locale,
} from "@/lib/i18n";

/**
 * Resolve the UI locale for this request.
 *
 * Logged-in users win with `User.locale`. Guests (and the first paint
 * before a session is available) fall back to the `pd_locale` cookie,
 * then Serbian.
 */
export async function resolveRequestLocale(): Promise<Locale> {
  try {
    const session = await getSession();
    if (session?.user?.id) {
      const row = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { locale: true },
      });
      const fromUser = parseLocale(row?.locale);
      if (fromUser) return fromUser;
    }
  } catch {
    // No session / DB blip — fall through to the cookie.
  }

  try {
    const jar = await cookies();
    const fromCookie = parseLocale(jar.get(LOCALE_COOKIE)?.value);
    if (fromCookie) return fromCookie;
  } catch {
    // cookies() can throw outside a request context (tests).
  }

  return DEFAULT_LOCALE;
}
