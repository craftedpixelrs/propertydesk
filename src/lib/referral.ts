/**
 * Agency referral codes on public URLs.
 *
 * A code on `?ref=` or `/p/r/<code>` is stored in `pd_ref` so a later
 * reservation on `/p/<token>` can attribute the agency.
 */

export const REFERRAL_COOKIE = "pd_ref";
export const REFERRAL_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

export function sanitizeReferralCode(
  raw: string | null | undefined,
): string | null {
  if (!raw) return null;
  const clean = raw.trim().replace(/[^A-Z0-9a-z_-]/g, "").slice(0, 32);
  return clean || null;
}

/** Prefer `?ref=`, otherwise the `/p/r/<code>` path segment. */
export function referralCodeFromUrl(
  pathname: string,
  searchRef: string | null,
): string | null {
  const fromQuery = sanitizeReferralCode(searchRef);
  if (fromQuery) return fromQuery;
  const match = pathname.match(/^\/p\/r\/([A-Za-z0-9_-]{1,32})\/?$/);
  return sanitizeReferralCode(match?.[1] ?? null);
}

export function publicReferralPath(code: string): string {
  return `/p/r/${encodeURIComponent(code)}`;
}
