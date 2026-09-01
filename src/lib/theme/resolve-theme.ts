import "server-only";

import { cookies } from "next/headers";

import { prisma } from "@/server/db/prisma";
import { getSession } from "@/server/auth/session";
import {
  DEFAULT_THEME,
  THEME_COOKIE,
  parseTheme,
  type Theme,
} from "@/lib/theme";

/**
 * Resolve the UI theme for this request.
 *
 * Logged-in users win with `User.theme`. Guests (and the first paint
 * before a session is available) fall back to the `pd_theme` cookie,
 * then light.
 */
export async function resolveRequestTheme(): Promise<Theme> {
  try {
    const session = await getSession();
    if (session?.user?.id) {
      const row = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { theme: true },
      });
      const fromUser = parseTheme(row?.theme);
      if (fromUser) return fromUser;
    }
  } catch {
    // No session / DB blip — fall through to the cookie.
  }

  try {
    const jar = await cookies();
    const fromCookie = parseTheme(jar.get(THEME_COOKIE)?.value);
    if (fromCookie) return fromCookie;
  } catch {
    // cookies() can throw outside a request context (tests).
  }

  return DEFAULT_THEME;
}
