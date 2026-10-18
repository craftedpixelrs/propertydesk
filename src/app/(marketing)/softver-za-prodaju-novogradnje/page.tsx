import type { Metadata } from "next";
import Link from "next/link";
import { Building2, MapPin } from "lucide-react";

import { CtaPanel } from "@/features/marketing/landing/cta-panel";
import { FeatureGrid } from "@/features/marketing/feature-grid";
import { PageHero } from "@/features/marketing/landing/page-hero";
import { ProblemSolutionGrid } from "@/features/marketing/landing/problem-solution-grid";
import { RelatedLinks } from "@/features/marketing/landing/related-links";
import { CITIES } from "@/features/marketing/cities/cities";
import { APP_NAME, MARKETING_URL } from "@/lib/constants/app";
import { createT, htmlLang } from "@/lib/i18n";
import { resolveRequestLocale } from "@/lib/i18n/resolve-locale";
import { JsonLd } from "@/lib/seo/json-ld";

const HUB_SLUG = "softver-za-prodaju-novogradnje";
const HUB_TITLE = "Softver za prodaju novogradnje";
const HUB_META_TITLE = "Softver za prodaju novogradnje u Srbiji";
// Ahrefs flagged the previous description (233 chars) as too long.
// We keep every tracked keyword (cenovnik, rezervacija, IPS QR, ugovor,
// provizija agencija) and the top three cities, but under 160 chars.
const HUB_DESCRIPTION =
  "Softver za prodaju novogradnje za investitore i agencije: cenovnik, rezervacija, IPS QR kapara, ugovor i provizija. Beograd, Novi Sad, Niš i 7 gradova.";

export async function generateMetadata(): Promise<Metadata> {
  const url = `${MARKETING_URL}/${HUB_SLUG}`;
  return {
    title: { absolute: `${HUB_META_TITLE} | ${APP_NAME}` },
    description: HUB_DESCRIPTION,
    alternates: {
      canonical: url,
      languages: { "sr-Latn": url, "x-default": url },
    },
    openGraph: {
      title: `${HUB_META_TITLE} | ${APP_NAME}`,
      description: HUB_DESCRIPTION,
      url,
      type: "website",
      locale: "sr_Latn",
      siteName: APP_NAME,
    },
    twitter: {
      card: "summary_large_image",
      title: `${HUB_META_TITLE} | ${APP_NAME}`,
      description: HUB_DESCRIPTION,
    },
  };
}

export default async function HubPage() {
  // Hub stranica je uvek na srpskom - gađamo organsku pretragu na
  // srpskom jeziku. Lokale biramo direktno umesto resolveRequestLocale
  // da bi i engleski posetilac video konzistentan srpski sadržaj.
  const locale = await resolveRequestLocale();
  const t = createT(locale);
  const url = `${MARKETING_URL}/${HUB_SLUG}`;

  const problems = [
    {
      problem:
        "Prodajete novogradnju u više gradova i svaki grad ima svoj Excel - niko ne zna ko ima najnoviju verziju.",
      solution:
        "Jedan nalog, više projekata, svaki grad i lokacija jasno obeleženi; cenovnik je deljen samo onima koje Vi dopustite.",
    },
    {
      problem:
        "Agencije iz Beograda rezervišu stan koji je agencija iz Novog Sada upravo prodala - niko ne vidi istu listu.",
      solution:
        "Real-time status po jedinici: čim bilo ko rezerviše ili proda, status se zaključava i vide ga svi partneri odjednom.",
    },
    {
      problem:
        "Kupci iz drugog grada ne mogu u Vašu kancelariju da uplate kaparu - prodaja se raspada na papirologiji.",
      solution:
        "Javni link projekta sa IPS QR kodom - kupac rezerviše i uplaćuje online iz svoje banke, bez dolaska u kancelariju.",
    },
    {
      problem:
        "Različiti gradovi, različite agencije, različita pravila provizije - obračun provizija traje danima.",
      solution:
        "Pravila provizije po projektu i jedinici, snapshot u trenutku ugovora, portal za agenciju sa statusom isplate - automatski.",
    },
  ];

  const webPageJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: `${HUB_META_TITLE} | ${APP_NAME}`,
    description: HUB_DESCRIPTION,
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
        item: url,
      },
    ],
  };

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: HUB_TITLE,
    itemListElement: CITIES.map((city, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: `${HUB_TITLE} ${city.nameLokativ}`,
      url: `${MARKETING_URL}/${HUB_SLUG}/${city.slug}`,
    })),
  };

  return (
    <>
      <PageHero
        eyebrow="Softver za prodaju novogradnje"
        icon={Building2}
        title="Softver za prodaju novogradnje u celoj Srbiji"
        subtitle="Jedan sistem za investitore i agencije: cenovnik, zalihe, rezervacija stana sa IPS QR kaparom, ugovor iz šablona, plan otplate, uplate i provizije - od Beograda i Novog Sada do Zlatibora i Kopaonika."
      />

      <ProblemSolutionGrid
        title="Isti problemi, bez obzira na grad"
        subtitle="Prodaja novogradnje u Srbiji ima isti oblik, bilo da gradite u Vračaru ili u Nišu. Softver mora da razume lokalni tok: IPS QR, EUR cene, SEF, i agencije koje su navikle na Viber."
        items={problems}
      />

      <section aria-labelledby="cities-title" className="bg-white">
        <div className="container-app py-16 sm:py-20">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold tracking-[0.16em] text-[#9a7430] uppercase">
              Lokalno
            </p>
            <h2
              id="cities-title"
              className="font-display mt-3 text-4xl font-semibold tracking-tight text-[#0b1020] sm:text-5xl"
            >
              Softver za prodaju novogradnje po gradovima
            </h2>
            <p className="mt-4 text-base leading-relaxed text-[var(--color-foreground-muted)]">
              Pogledajte stranicu za Vaš grad - svaka ima opis lokalnog tržišta,
              listu opština ili karakterističnih naselja i česta pitanja koja
              čujemo baš od investitora iz tog grada.
            </p>
          </div>

          <ul className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {CITIES.map((city) => (
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
                      Softver za prodaju novogradnje {city.nameLokativ}
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
