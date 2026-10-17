import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Building2, MapPin } from "lucide-react";

import { CtaPanel } from "@/features/marketing/landing/cta-panel";
import { FeatureGrid } from "@/features/marketing/feature-grid";
import { PageHero } from "@/features/marketing/landing/page-hero";
import { ProblemSolutionGrid } from "@/features/marketing/landing/problem-solution-grid";
import { RelatedLinks } from "@/features/marketing/landing/related-links";
import { CITIES, getCityBySlug } from "@/features/marketing/cities/cities";
import { APP_NAME, MARKETING_URL } from "@/lib/constants/app";
import { createT, htmlLang } from "@/lib/i18n";
import { resolveRequestLocale } from "@/lib/i18n/resolve-locale";
import { JsonLd } from "@/lib/seo/json-ld";

const HUB_SLUG = "softver-za-prodaju-novogradnje";
const HUB_TITLE = "Softver za prodaju novogradnje";

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

  const url = `${MARKETING_URL}/${HUB_SLUG}/${city.slug}`;
  const title = `${HUB_TITLE} ${city.nameLokativ}`;
  const description = `${HUB_TITLE} ${city.nameLokativ}: cenovnik, rezervacija stana sa IPS QR kaparom, ugovor iz šablona, uplate i provizija agencije. Jedna platforma za investitore i agencije koje prodaju novogradnju.`;

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
      locale: "sr_Latn",
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

  const url = `${MARKETING_URL}/${HUB_SLUG}/${city.slug}`;
  const title = `${HUB_TITLE} ${city.nameLokativ}`;

  const neighbors = city.neighbors
    .map((slug) => getCityBySlug(slug))
    .filter((c): c is NonNullable<typeof c> => Boolean(c));

  const problems = [
    {
      problem:
        "Cenovnik u Excelu se grana - tim u kancelariji i tim na gradilištu rade u različitim verzijama.",
      solution:
        "Jedan cenovnik po projektu, jedna istina za ceo tim, sa trag izmena ko je i kada menjao cenu.",
    },
    {
      problem:
        "Agencija rezerviše stan preko Vibera - druga agencija prodaje isti stan drugom kupcu.",
      solution:
        "Jedna aktivna rezervacija po jedinici, status zaključan za sve agencije u realnom vremenu.",
    },
    {
      problem:
        "Kupac traži kaparu preko e-bankinga, Vi mu dajete poziv na broj mejlom - uplata ne stigne pola nedelje.",
      solution:
        "IPS QR na javnom linku jedinice - kupac skenira iz svoje banke i uplaćuje kaparu u par sekundi.",
    },
    {
      problem:
        "Ne znate ko je kome agent, provizije se kasnije dogovaraju iz glave, uvek jedan ispadne nezadovoljan.",
      solution:
        "Pravila provizije unapred po projektu i jedinici, snapshot u trenutku ugovora, portal za agenciju sa statusom isplate.",
    },
  ];

  const webPageJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: `${title} | ${APP_NAME}`,
    description: city.intro,
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
        name: HUB_TITLE,
        item: `${MARKETING_URL}/${HUB_SLUG}`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: city.name,
        item: url,
      },
    ],
  };

  const serviceJsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    serviceType: "Softver za prodaju novogradnje",
    provider: {
      "@type": "Organization",
      name: APP_NAME,
      url: `${MARKETING_URL}/`,
    },
    areaServed: {
      "@type": "City",
      name: city.name,
      containedInPlace: {
        "@type": "Country",
        name: "Srbija",
      },
    },
    url,
    description: city.intro,
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: city.faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: f.a,
      },
    })),
  };

  return (
    <>
      <PageHero
        eyebrow={`Softver za prodaju novogradnje · ${city.name}`}
        icon={Building2}
        title={`Softver za prodaju novogradnje ${city.nameLokativ}`}
        subtitle={city.intro}
      />

      <ProblemSolutionGrid
        title={`Kako PropertyDesk pomaže investitorima ${city.nameLokativ}`}
        subtitle="Isti problemi, isti sistem - bez obzira na to kako se zovu Vaše opštine i naselja."
        items={problems}
      />

      <section aria-labelledby="districts-title" className="bg-white">
        <div className="container-app py-16 sm:py-20">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold tracking-[0.16em] text-[#9a7430] uppercase">
              {city.name}
            </p>
            <h2
              id="districts-title"
              className="font-display mt-3 text-4xl font-semibold tracking-tight text-[#0b1020] sm:text-5xl"
            >
              {city.districtsTitle}
            </h2>
            <p className="mt-4 text-base leading-relaxed text-[var(--color-foreground-muted)]">
              PropertyDesk ne pravi razliku između lokacija - sistem radi isto u svim delovima{" "}
              {city.nameGenitiv}. Dole su delovi grada u kojima danas vidimo najviše aktivne
              novogradnje.
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
              Česta pitanja - {city.name}
            </h2>
          </div>
          <dl className="mt-8 space-y-4">
            {city.faqs.map((f) => (
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
          title={`Drugi gradovi u blizini ${city.nameGenitiv}`}
          items={neighbors.map((n) => ({
            href: `/${HUB_SLUG}/${n.slug}`,
            label: `Softver za prodaju novogradnje ${n.nameLokativ}`,
          }))}
        />
      ) : null}

      <RelatedLinks
        title={t("marketing.anchors.related")}
        items={[
          { href: `/${HUB_SLUG}`, label: HUB_TITLE },
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
