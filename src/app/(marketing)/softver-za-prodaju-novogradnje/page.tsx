import type { Metadata } from "next";
import Link from "next/link";
import { Building2, MapPin } from "lucide-react";

import { CtaPanel } from "@/features/marketing/landing/cta-panel";
import { FeatureGrid } from "@/features/marketing/feature-grid";
import { PageHero } from "@/features/marketing/landing/page-hero";
import { ProblemSolutionGrid } from "@/features/marketing/landing/problem-solution-grid";
import { RelatedLinks } from "@/features/marketing/landing/related-links";
import { CITIES, localizeCity } from "@/features/marketing/cities/cities";
import { hubCopy } from "@/features/marketing/cities/cities-ui";
import { APP_NAME, MARKETING_URL } from "@/lib/constants/app";
import { createT, htmlLang } from "@/lib/i18n";
import { resolveRequestLocale } from "@/lib/i18n/resolve-locale";
import { JsonLd } from "@/lib/seo/json-ld";

const HUB_SLUG = "softver-za-prodaju-novogradnje";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await resolveRequestLocale();
  const copy = hubCopy(locale);
  const url = `${MARKETING_URL}/${HUB_SLUG}`;
  return {
    title: { absolute: `${copy.metaTitle} | ${APP_NAME}` },
    description: copy.description,
    alternates: {
      canonical: url,
      languages: { "sr-Latn": url, "x-default": url },
    },
    openGraph: {
      title: `${copy.metaTitle} | ${APP_NAME}`,
      description: copy.description,
      url,
      type: "website",
      locale: locale === "en" ? "en_GB" : "sr_Latn",
      siteName: APP_NAME,
    },
    twitter: {
      card: "summary_large_image",
      title: `${copy.metaTitle} | ${APP_NAME}`,
      description: copy.description,
    },
  };
}

export default async function HubPage() {
  const locale = await resolveRequestLocale();
  const t = createT(locale);
  const copy = hubCopy(locale);
  const url = `${MARKETING_URL}/${HUB_SLUG}`;
  const cities = CITIES.map((city) => localizeCity(city, locale));

  const webPageJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: `${copy.metaTitle} | ${APP_NAME}`,
    description: copy.description,
    url,
    inLanguage: htmlLang(locale),
    isPartOf: {
      "@type": "WebSite",
      name: APP_NAME,
      url: MARKETING_URL,
    },
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: t("nav.home"),
        item: MARKETING_URL,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: copy.title,
        item: url,
      },
    ],
  };

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: copy.title,
    itemListElement: cities.map((city, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: copy.listName(city.nameLokativ),
      url: `${MARKETING_URL}/${HUB_SLUG}/${city.slug}`,
    })),
  };

  return (
    <>
      <PageHero
        eyebrow={copy.eyebrow}
        icon={Building2}
        title={copy.heroTitle}
        subtitle={copy.heroSubtitle}
      />

      <ProblemSolutionGrid
        title={copy.problemsTitle}
        subtitle={copy.problemsSubtitle}
        items={copy.problems}
      />

      <section aria-labelledby="cities-title" className="bg-white">
        <div className="container-app py-16 sm:py-20">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold tracking-[0.16em] text-[#9a7430] uppercase">
              {copy.localEyebrow}
            </p>
            <h2
              id="cities-title"
              className="font-display mt-3 text-4xl font-semibold tracking-tight text-[#0b1020] sm:text-5xl"
            >
              {copy.citiesTitle}
            </h2>
            <p className="mt-4 text-base leading-relaxed text-[var(--color-foreground-muted)]">
              {copy.citiesBody}
            </p>
          </div>

          <ul className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {cities.map((city) => (
              <li key={city.slug}>
                <Link
                  href={`/${HUB_SLUG}/${city.slug}`}
                  className="flex items-start gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-sm transition-colors hover:border-[#d6b26a] hover:bg-[#f3e2bc]/40"
                >
                  <span
                    aria-hidden
                    className="grid size-9 flex-none place-items-center rounded-lg bg-[#0b1020] text-[#f3e2bc]"
                  >
                    <MapPin className="size-4" />
                  </span>
                  <div>
                    <div className="font-display text-lg font-semibold text-[#0b1020]">
                      {city.name}
                    </div>
                    <p className="mt-1 text-sm leading-relaxed text-[var(--color-foreground-muted)]">
                      {copy.card(city.nameLokativ)}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <FeatureGrid />

      <RelatedLinks
        title={t("marketing.anchors.related")}
        items={[
          { href: "/prodaja-novogradnje", label: t("marketing.anchors.newBuild") },
          { href: "/za-investitore", label: t("marketing.anchors.investors") },
          { href: "/za-agencije", label: t("marketing.anchors.agencies") },
          { href: "/alternative-excelu", label: t("marketing.anchors.excel") },
          { href: "/rezervacije-i-uplate", label: t("marketing.anchors.reservation") },
        ]}
      />

      <CtaPanel />

      <JsonLd data={webPageJsonLd} />
      <JsonLd data={breadcrumbJsonLd} />
      <JsonLd data={itemListJsonLd} />
    </>
  );
}
