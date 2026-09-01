export type Theme = "light" | "dark";

export const DEFAULT_THEME: Theme = "light";
export const SUPPORTED_THEMES: readonly Theme[] = ["light", "dark"];
export const THEME_COOKIE = "pd_theme";
export const THEME_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function isTheme(value: unknown): value is Theme {
  return value === "light" || value === "dark";
}

export function parseTheme(value: string | null | undefined): Theme | null {
  if (!value) return null;
  const trimmed = value.trim().toLowerCase();
  if (isTheme(trimmed)) return trimmed;
  return null;
}

export function writeThemeCookieValue(theme: Theme): string {
  return `${THEME_COOKIE}=${theme}; Path=/; Max-Age=${THEME_COOKIE_MAX_AGE}; SameSite=Lax`;
}

/** Read `pd_theme` from a Cookie header or `document.cookie` string. */
export function themeFromCookieString(
  cookieHeader: string | undefined | null,
): Theme | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(
    new RegExp(`(?:^|;\\s*)${THEME_COOKIE}=([^;]*)`),
  );
  return parseTheme(match?.[1] ? decodeURIComponent(match[1]) : null);
}

/**
 * Theme for an incoming HTTP request: `x-pd-theme` header, then cookie,
 * then light.
 */
export function themeFromRequest(req: {
  headers: { get(name: string): string | null };
  cookies: { get(name: string): { value: string } | undefined };
}): Theme {
  const fromHeader = parseTheme(req.headers.get("x-pd-theme"));
  if (fromHeader) return fromHeader;

  const fromCookie = parseTheme(req.cookies.get(THEME_COOKIE)?.value);
  if (fromCookie) return fromCookie;

  return DEFAULT_THEME;
}

export function applyThemeToDocument(theme: Theme): void {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
}
