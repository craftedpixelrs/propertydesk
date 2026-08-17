import {
  COOKIE_CONSENT_EVENT,
  COOKIE_CONSENT_KEY,
  type CookieConsent,
} from "@/lib/constants/app";

export function readCookieConsent(): CookieConsent | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(COOKIE_CONSENT_KEY);
    if (raw === "accepted" || raw === "rejected") return raw;
  } catch {
    // Private mode / blocked storage — treat as no choice yet.
  }
  return null;
}

export function writeCookieConsent(value: CookieConsent): void {
  try {
    window.localStorage.setItem(COOKIE_CONSENT_KEY, value);
  } catch {
    // Ignore quota / privacy-mode failures; the banner may reappear.
  }
  window.dispatchEvent(new CustomEvent(COOKIE_CONSENT_EVENT, { detail: value }));
}
