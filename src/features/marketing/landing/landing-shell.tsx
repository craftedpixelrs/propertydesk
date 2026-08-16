import type { Metadata } from "next";

import { APP_NAME, MARKETING_URL } from "@/lib/constants/app";
import { htmlLang, t, type Locale, type TranslationKey } from "@/lib/i18n";

interface LandingMeta {
  slug: string;
  title: string;
  description: string;
  locale: Locale;
  /**
   * Optional short label used for the `BreadcrumbList` item name.
   * Defaults to the page title.
   */
  breadcrumb?: string;
}

/**
 * Build a Next.js `Metadata` object with sensible defaults for a topic
 * landing page. Every topic page reuses the same OG image dimensions
 * and Twitter card layout as the root marketing page.
 */
export function buildLandingMetadata({
  slug,
  title,
  description,
  locale,
}: LandingMeta): Metadata {
  const url = `${MARKETING_URL}/${slug}`;
  return {
    title: { absolute: `${title} | ${APP_NAME}` },
    description,
    alternates: { canonical: `/${slug}` },
    openGraph: {
      title: `${title} | ${APP_NAME}`,
      description,
      url,
      type: "website",
      locale: locale === "en" ? "en_GB" : "sr_Latn",
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | ${APP_NAME}`,
      description,
    },
  };
}

/**
 * Emit the standard triple of JSON-LD blocks (WebPage + BreadcrumbList)
 * used by every topic landing page for structured-data SEO.
 */
export function LandingJsonLd({
  slug,
  title,
  description,
  locale,
  breadcrumb,
}: LandingMeta) {
  const url = `${MARKETING_URL}/${slug}`;
  const webPage = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: `${title} | ${APP_NAME}`,
    description,
    url,
    inLanguage: htmlLang(locale),
    isPartOf: {
      "@type": "WebSite",
      name: APP_NAME,
      url: MARKETING_URL,
    },
  };

  const breadcrumbList = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: t("nav.home", undefined, locale),
        item: MARKETING_URL,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: breadcrumb ?? title,
        item: url,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webPage) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbList) }}
      />
    </>
  );
}

/**
 * Route list used by the sitemap and the "Rešenja" footer column so
 * every topic landing page is discoverable via internal links.
 */
export const LANDING_ROUTES = [
  { slug: "za-investitore", labelKey: "marketing.nav.investors" },
  { slug: "za-agencije", labelKey: "marketing.nav.agencies" },
  { slug: "prodaja-novogradnje", labelKey: "marketing.nav.newBuild" },
  { slug: "crm-za-investitore", labelKey: "marketing.nav.crm" },
  { slug: "alternative-excelu", labelKey: "marketing.nav.excel" },
  { slug: "rezervacije-i-uplate", labelKey: "marketing.nav.reservations" },
  { slug: "provizije-agencija", labelKey: "marketing.nav.commissions" },
  { slug: "demo", labelKey: "marketing.nav.bookDemo" },
] as const satisfies ReadonlyArray<{ slug: string; labelKey: TranslationKey }>;

export type LandingSlug = (typeof LANDING_ROUTES)[number]["slug"];
