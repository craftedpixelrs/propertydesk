import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Building2, MapPin } from "lucide-react";

import { CtaPanel } from "@/features/marketing/landing/cta-panel";
import { FeatureGrid } from "@/features/marketing/feature-grid";
import { PageHero } from "@/features/marketing/landing/page-hero";
import { ProblemSolutionGrid } from "@/features/marketing/landing/problem-solution-grid";
import { RelatedLinks } from "@/features/marketing/landing/related-links";
import { CITIES, getCityBySlug, localizeCity } from "@/features/marketing/cities/cities";
import { cityChrome } from "@/features/marketing/cities/cities-ui";
import { APP_NAME, MARKETING_URL } from "@/lib/constants/app";
import { createT, htmlLang } from "@/lib/i18n";
import { resolveRequestLocale } from "@/lib/i18n/resolve-locale";
import { JsonLd } from "@/lib/seo/json-ld";

const HUB_SLUG = "softver-za-prodaju-novogradnje";

interface PageProps {
  params: Promise<{ grad: string }>;
}

/**
 * Pre-renderujemo samo gradove iz `CITIES`. `dynamicParams = false`
 * znači da sve ostalo odmah pada na 404 - važno da Google ne indeksira
 * slučajne URL-ove tipa `/.../fake-city`.
 */
export const dynamicParams = false;

export function generateStaticParams() {
  return CITIES.map((c) => ({ grad: c.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { grad } = await params;
  const city = getCityBySlug(grad);
  if (!city) return {};

  const locale = await resolveRequestLocale();
  const copy = cityChrome(locale);
  const local = localizeCity(city, locale);
  const url = `${MARKETING_URL}/${HUB_SLUG}/${city.slug}`;
  const title = copy.metaTitle(local.nameLokativ);
  // Keep the description under 160 characters. Googlebot has no locale
  // cookie, so the indexed text stays the Serbian default.
  const description = copy.description(local.nameLokativ);

  return {
    title: { absolute: `${title} | ${APP_NAME}` },
    description,
    alternates: {
      canonical: url,
      languages: { "sr-Latn": url, "x-default": url },
    },
    openGraph: {
      title: `${title} | ${APP_NAME}`,
      description,
      url,
      type: "website",
      locale: locale === "en" ? "en_GB" : "sr_Latn",
      siteName: APP_NAME,
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | ${APP_NAME}`,
      description,
    },
  };
}

export default async function CityPage({ params }: PageProps) {
  const { grad } = await params;
  const city = getCityBySlug(grad);
  if (!city) notFound();

  const locale = await resolveRequestLocale();
  const t = createT(locale);
  const copy = cityChrome(locale);
  const local = localizeCity(city, locale);

  const url = `${MARKETING_URL}/${HUB_SLUG}/${city.slug}`;
  const title = copy.title(local.nameLokativ);

  const neighbors = city.neighbors
    .map((slug) => getCityBySlug(slug))
    .filter((c): c is NonNullable<typeof c> => Boolean(c))
    .map((neighbor) => localizeCity(neighbor, locale));

  const webPageJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: `${title} | ${APP_NAME}`,
    description: local.intro,
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
        name: copy.hubTitle,
        item: `${MARKETING_URL}/${HUB_SLUG}`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: local.name,
        item: url,
      },
    ],
  };

  const serviceJsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    serviceType: copy.serviceType,
    provider: {
      "@type": "Organization",
      name: APP_NAME,
      url: `${MARKETING_URL}/`,
    },
    areaServed: {
      "@type": "City",
      name: local.name,
      containedInPlace: {
        "@type": "Country",
        name: copy.country,
      },
    },
    url,
    description: local.intro,
  };

  // Same normalisation as on the home-page FAQ schema: strip any stray
  // {{placeholder}} or HTML tag that would trip Google's structured-data
  // validator (Ahrefs flagged the home page for this).
  const faqAnswerText = (raw: string) =>
    raw
      .replace(/\{\{[^}]+\}\}/g, "")
      .replace(/<[^>]+>/g, "")
      .replace(/\s+/g, " ")
      .trim();

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": `${url}#faq`,
    inLanguage: htmlLang(locale),
    mainEntity: local.faqs.map((f, idx) => ({
      "@type": "Question",
      "@id": `${url}#faq-q${idx + 1}`,
      name: f.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: faqAnswerText(f.a),
      },
    })),
  };

  return (
    <>
      <PageHero
        eyebrow={copy.eyebrow(local.name)}
        icon={Building2}
        title={title}
        subtitle={local.intro}
      />

      <ProblemSolutionGrid
        title={copy.problemsTitle(local.nameLokativ)}
        subtitle={copy.problemsSubtitle}
        items={copy.problems}
      />

      <section aria-labelledby="districts-title" className="bg-white">
        <div className="container-app py-16 sm:py-20">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold tracking-[0.16em] text-[#9a7430] uppercase">
              {local.name}
            </p>
            <h2
              id="districts-title"
              className="font-display mt-3 text-4xl font-semibold tracking-tight text-[#0b1020] sm:text-5xl"
            >
              {local.districtsTitle}
            </h2>
            <p className="mt-4 text-base leading-relaxed text-[var(--color-foreground-muted)]">
              {copy.districtsBody(local.nameGenitiv)}
            </p>
          </div>

          <ul className="mt-8 flex flex-wrap gap-2">
            {city.districts.map((d) => (
              <li
                key={d}
                className="inline-flex items-center gap-2 rounded-full border border-[#0b1020]/10 bg-[var(--color-surface)] px-3 py-1.5 text-sm text-[#0b1020]"
              >
                <MapPin aria-hidden className="size-3.5 text-[#9a7430]" />
                {d}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="faq-title" className="bg-[#f7f3ea]">
        <div className="container-app py-16 sm:py-20">
          <div className="max-w-3xl">
            <h2
              id="faq-title"
              className="font-display text-4xl font-semibold tracking-tight text-[#0b1020] sm:text-5xl"
            >
              {copy.faqTitle(local.name)}
            </h2>
          </div>
          <dl className="mt-8 space-y-4">
            {local.faqs.map((f) => (
              <div
                key={f.q}
                className="rounded-2xl border border-[var(--color-border)] bg-white p-5 shadow-sm sm:p-6"
              >
                <dt className="font-display text-lg font-semibold text-[#0b1020]">{f.q}</dt>
                <dd className="mt-2 text-sm leading-relaxed text-[var(--color-foreground)]">
                  {f.a}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <FeatureGrid />

      {neighbors.length > 0 ? (
        <RelatedLinks
          title={copy.neighborsTitle(local.nameGenitiv)}
          items={neighbors.map((n) => ({
            href: `/${HUB_SLUG}/${n.slug}`,
            label: copy.neighborLabel(n.nameLokativ),
          }))}
        />
      ) : null}

      <RelatedLinks
        title={t("marketing.anchors.related")}
        items={[
          { href: `/${HUB_SLUG}`, label: copy.hubTitle },
          { href: "/prodaja-novogradnje", label: t("marketing.anchors.newBuild") },
          { href: "/za-investitore", label: t("marketing.anchors.investors") },
          { href: "/za-agencije", label: t("marketing.anchors.agencies") },
          { href: "/rezervacije-i-uplate", label: t("marketing.anchors.reservation") },
        ]}
      />

      <CtaPanel />

      <JsonLd data={webPageJsonLd} />
      <JsonLd data={breadcrumbJsonLd} />
      <JsonLd data={serviceJsonLd} />
      <JsonLd data={faqJsonLd} />
    </>
  );
}
