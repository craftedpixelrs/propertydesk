import type { Metadata } from "next";

import { APP_NAME, MARKETING_URL } from "@/lib/constants/app";

interface LandingMeta {
  slug: string;
  title: string;
  description: string;
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
      locale: "sr_Latn",
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
  breadcrumb,
}: LandingMeta) {
  const url = `${MARKETING_URL}/${slug}`;
  const webPage = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: `${title} | ${APP_NAME}`,
    description,
    url,
    inLanguage: "sr-Latn",
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
        name: "Početna",
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
  { slug: "za-investitore", label: "Za investitore" },
  { slug: "za-agencije", label: "Za agencije" },
  { slug: "prodaja-novogradnje", label: "Prodaja novogradnje" },
  { slug: "crm-za-investitore", label: "CRM za investitore" },
  { slug: "alternative-excelu", label: "Alternativa Excelu" },
  { slug: "rezervacije-i-uplate", label: "Rezervacije i uplate" },
  { slug: "provizije-agencija", label: "Provizije agencija" },
  { slug: "demo", label: "Zakažite demo" },
] as const;

export type LandingSlug = (typeof LANDING_ROUTES)[number]["slug"];
