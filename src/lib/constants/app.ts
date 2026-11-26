import { publicEnv } from "@/lib/env";

/**
 * Runtime-safe app-wide constants. Values that vary between server/client
 * must come from `publicEnv` (NEXT_PUBLIC_*) so they are exposed to the browser.
 *
 * The product name is intentionally sourced from env so a future rename is
 * a single environment-variable change.
 */

export const APP_NAME = publicEnv.NEXT_PUBLIC_APP_NAME;
export const APP_LOCALE = publicEnv.NEXT_PUBLIC_APP_LOCALE;
export const APP_TIMEZONE = publicEnv.NEXT_PUBLIC_APP_TIMEZONE;
/**
 * Base URL of the authenticated application (Better Auth callback origin,
 * `my.propertydesk.app` in prod). Used by API clients, auth cookies and
 * absolute links back into the SaaS app.
 */
export const APP_URL = publicEnv.NEXT_PUBLIC_APP_URL;

/**
 * Public URL of the authenticated application on its own subdomain. Every
 * "sign in" / "open the app" CTA on the marketing landing points at this.
 */
export const MY_APP_URL = publicEnv.NEXT_PUBLIC_MY_APP_URL;

/**
 * Bare apex domain (`propertydesk.app` in prod). Used to compose canonical
 * URLs for the marketing landing / topic pages / sitemap / JSON-LD -
 * unlike `APP_URL`, this must NEVER include the `my.` subdomain.
 */
export const APP_DOMAIN = publicEnv.NEXT_PUBLIC_APP_DOMAIN;

/** Live walkthrough of the product. Marketing "Otvori demo" points here. */
export const DEMO_APP_URL = `https://demo.${APP_DOMAIN}`;

/**
 * Absolute URL of the marketing site (apex). Always points at the public
 * landing at `https://propertydesk.app`, independent of `APP_URL` (which
 * may point at the authenticated `my.propertydesk.app` subdomain).
 */
export const MARKETING_URL = `https://${APP_DOMAIN}`;

/**
 * Loops (loops.so) public form ID. When empty the landing page hides the
 * form or shows a graceful "not configured yet" state instead of a broken
 * submit. This is intentional so the site can ship before the ID is
 * provisioned.
 */
export const LOOPS_FORM_ID = publicEnv.NEXT_PUBLIC_LOOPS_FORM_ID ?? "";

/**
 * Google Calendar Appointment Schedules embed URL. When empty the
 * `BookingEmbed` component renders a fallback CTA pointing to the lead
 * form. Server + client safe.
 */
export const GOOGLE_APPOINTMENT_URL = publicEnv.NEXT_PUBLIC_GOOGLE_APPOINTMENT_URL ?? "";

/**
 * Public URL of the product overview video (YouTube or `.mp4`). Empty
 * value keeps the `ProductVideo` section as a "video stiže uskoro"
 * placeholder that funnels toward the demo booking.
 */
export const PRODUCT_VIDEO_URL = publicEnv.NEXT_PUBLIC_PRODUCT_VIDEO_URL ?? "";

/**
 * Historical SaaS launch date. Still used by JSON-LD availabilityStarts.
 * If you change it, also update the FAQ and offer banner copy.
 */
export const LAUNCH_DATE_ISO = "2026-11-15";

/**
 * Stable "last updated" date for sitemap `lastmod`. Do not use
 * `new Date()` per request — that tells Google every crawl is a new edit.
 */
export const MARKETING_CONTENT_UPDATED = "2026-10-18";

/**
 * Human-readable launch date used across marketing copy. Kept next to
 * `LAUNCH_DATE_ISO` so a future date change is a two-line diff.
 */
export const LAUNCH_DATE_LABEL = "15.11.2026.";

/**
 * Public contact + operator identity for the marketing site, JSON-LD,
 * legal pages and the lead-form consent line. Keep these in one place
 * so a mailbox or phone change is a single diff.
 *
 * Registry identifiers (PIB, MB, street address) are intentionally
 * omitted until the invoicing entity is registered — inventing them
 * on the impressum would be worse than leaving them blank.
 */
export const COMPANY = {
  productName: "PropertyDesk",
  operatorName: "CraftedPixel",
  operatorUrl: "https://craftedpixel.rs",
  email: "hello@propertydesk.app",
  phoneDisplay: "+381 65 43 63 142",
  phoneTel: "+381654363142",
  country: "RS",
} as const;

/** localStorage key for marketing-site cookie / analytics consent. */
export const COOKIE_CONSENT_KEY = "pd_cookie_consent";
export const COOKIE_CONSENT_EVENT = "pd-cookie-consent";
export const COOKIE_SETTINGS_EVENT = "pd-cookie-settings";
export type CookieConsent = "accepted" | "rejected";

/**
 * Landing-page visual assets, all under
 * [public/images/landing/](../../../public/images/landing).
 */
export const LANDING_IMAGES = {
  /**
   * Real screens captured from the demo organisations at 1440×810,
   * exported at 2400 px wide. The marketing site draws its own browser
   * window around them.
   */
  screens: {
    reservations: { src: "/images/landing/app-reservations.webp", width: 2400, height: 1350 },
    units: { src: "/images/landing/app-units.webp", width: 2400, height: 1350 },
    sale: { src: "/images/landing/app-sale.webp", width: 2400, height: 1350 },
    payments: { src: "/images/landing/app-payments.webp", width: 2400, height: 1350 },
    dashboard: { src: "/images/landing/app-dashboard.webp", width: 2400, height: 1350 },
    agency: { src: "/images/landing/app-agency.webp", width: 2400, height: 1350 },
    manager: { src: "/images/landing/app-manager.webp", width: 2400, height: 1350 },
    mobile: { src: "/images/landing/app-mobile.webp", width: 790, height: 1620 },
  },
  /** Square brand mark used in the marketing header, footer, and social preview. */
  logo: {
    src: "/images/landing/logo.png",
    width: 649,
    height: 621,
  } as const,
} as const;

/**
 * Imagery for the unauthenticated split-screen (sign-in, invite, reset).
 * The hero is a full-bleed photo; the layout applies a light overlay on top.
 */
export const AUTH_IMAGES = {
  hero: {
    src: "/images/auth/hero.jpg",
    width: 1024,
    height: 1536,
  } as const,
} as const;

export const SUPPORTED_CURRENCIES = ["EUR", "RSD"] as const;
export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

export const DEFAULT_CURRENCY: SupportedCurrency = "EUR";

export const DATE_FORMAT = "dd.MM.yyyy.";
export const DATETIME_FORMAT = "dd.MM.yyyy. HH:mm";
