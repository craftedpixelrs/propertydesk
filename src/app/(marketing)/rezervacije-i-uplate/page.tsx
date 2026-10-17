import type { Metadata } from "next";
import { Wallet } from "lucide-react";

import { PageHero } from "@/features/marketing/landing/page-hero";
import { ProblemSolutionGrid } from "@/features/marketing/landing/problem-solution-grid";
import { RelatedReading } from "@/features/marketing/blog/related-reading";
import { RelatedLinks } from "@/features/marketing/landing/related-links";
import { CtaPanel } from "@/features/marketing/landing/cta-panel";
import { buildLandingMetadata, LandingJsonLd } from "@/features/marketing/landing/landing-shell";
import { createT, type TranslateFn } from "@/lib/i18n";
import { resolveRequestLocale } from "@/lib/i18n/resolve-locale";

function pairs(t: TranslateFn) {
  return [1, 2, 3, 4, 5].map((n) => ({
    problem: t(`marketing.pages.reservations.p${n}` as `marketing.pages.reservations.p1`),
    solution: t(`marketing.pages.reservations.s${n}` as `marketing.pages.reservations.s1`),
  }));
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await resolveRequestLocale();
  const t = createT(locale);
  return buildLandingMetadata({
    slug: "rezervacije-i-uplate",
    title: t("marketing.pages.reservations.metaTitle"),
    description: t("marketing.pages.reservations.metaDescription"),
    locale,
  });
}

export default async function Page() {
  const locale = await resolveRequestLocale();
  const t = createT(locale);

  return (
    <>
      <PageHero
        eyebrow={t("marketing.pages.reservations.eyebrow")}
        icon={Wallet}
        title={t("marketing.pages.reservations.title")}
        subtitle={t("marketing.pages.reservations.subtitle")}
      />
      <ProblemSolutionGrid
        title={t("marketing.pages.reservations.gridTitle")}
        subtitle={t("marketing.pages.reservations.gridSubtitle")}
        items={pairs(t)}
      />
      <RelatedLinks
        title={t("marketing.anchors.related")}
        items={[
          { href: "/prodaja-novogradnje", label: t("marketing.anchors.newBuild") },
          { href: "/za-agencije", label: t("marketing.anchors.agencies") },
          { href: "/", label: t("marketing.anchors.software") },
        ]}
      />
      <RelatedReading
        slugs={["ips-qr-kapara-online-rezervacija-stana", "evidencija-uplata-za-stanove"]}
      />
      <CtaPanel />
      <LandingJsonLd
        slug="rezervacije-i-uplate"
        title={t("marketing.pages.reservations.metaTitle")}
        description={t("marketing.pages.reservations.metaDescription")}
        locale={locale}
      />
    </>
  );
}
