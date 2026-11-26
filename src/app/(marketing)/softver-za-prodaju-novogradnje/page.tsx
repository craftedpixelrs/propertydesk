import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Building2, MapPin } from "lucide-react";

import { CtaPanel } from "@/features/marketing/landing/cta-panel";
import { FeatureGrid } from "@/features/marketing/feature-grid";
import { PageHero } from "@/features/marketing/landing/page-hero";
import { ProblemSolutionGrid } from "@/features/marketing/landing/problem-solution-grid";
import { RelatedLinks } from "@/features/marketing/landing/related-links";
import { Index, SectionHeading } from "@/features/marketing/ui";
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

      <section aria-labelledby="cities-title" className="border-line border-t">
        <div className="container-app py-20 sm:py-28">
          <SectionHeading
            id="cities-title"
            eyebrow={copy.localEyebrow}
            title={copy.citiesTitle}
            subtitle={copy.citiesBody}
          />

          <ul className="border-line bg-line mt-12 grid gap-px overflow-hidden rounded-3xl border sm:grid-cols-2 lg:grid-cols-3">
            {cities.map((city, i) => (
              <li
                key={city.slug}
                className={
                  // The last card closes the row, so the hairline grid has no empty cell.
                  i === cities.length - 1
                    ? [
                        "bg-white",
                        cities.length % 2 === 1 ? "sm:col-span-2" : "sm:col-span-1",
                        cities.length % 3 === 1
                          ? "lg:col-span-3"
                          : cities.length % 3 === 2
                            ? "lg:col-span-2"
                            : "lg:col-span-1",
                      ].join(" ")
                    : "bg-white"
                }
              >
                <Link
                  href={`/${HUB_SLUG}/${city.slug}`}
                  className="group hover:bg-ink flex h-full flex-col p-6 transition-colors duration-300"
                >
                  <div className="flex items-center justify-between">
                    <MapPin
                      aria-hidden
                      className="text-tide-700 group-hover:text-tide-300 size-5 transition-colors"
                      strokeWidth={1.75}
                    />
                    <Index n={i + 1} className="text-faint group-hover:text-white/40" />
                  </div>
                  <div className="text-ink mt-6 flex items-center gap-2 text-xl font-bold tracking-[-0.025em] transition-colors group-hover:text-white">
                    {city.name}
                    <ArrowUpRight
                      aria-hidden
                      className="text-tide-300 size-4 opacity-0 transition-opacity group-hover:opacity-100"
                    />
                  </div>
                  <p className="text-mute mt-2 text-sm leading-relaxed transition-colors group-hover:text-white/65">
                    {copy.card(city.nameLokativ)}
                  </p>
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
