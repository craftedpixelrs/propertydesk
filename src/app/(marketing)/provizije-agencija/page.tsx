import type { Metadata } from "next";
import { BadgeCheck } from "lucide-react";

import { PageHero } from "@/features/marketing/landing/page-hero";
import { ProblemSolutionGrid } from "@/features/marketing/landing/problem-solution-grid";
import { RelatedReading } from "@/features/marketing/blog/related-reading";
import { RelatedLinks } from "@/features/marketing/landing/related-links";
import { CtaPanel } from "@/features/marketing/landing/cta-panel";
import { buildLandingMetadata, LandingJsonLd } from "@/features/marketing/landing/landing-shell";
import { createT, type TranslateFn } from "@/lib/i18n";
import { resolveRequestLocale } from "@/lib/i18n/resolve-locale";

function pairs(t: TranslateFn) {
  return [1, 2, 3, 4].map((n) => ({
    problem: t(`marketing.pages.commissions.p${n}` as `marketing.pages.commissions.p1`),
    solution: t(`marketing.pages.commissions.s${n}` as `marketing.pages.commissions.s1`),
  }));
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await resolveRequestLocale();
  const t = createT(locale);
  return buildLandingMetadata({
    slug: "provizije-agencija",
    title: t("marketing.pages.commissions.metaTitle"),
    description: t("marketing.pages.commissions.metaDescription"),
    locale,
  });
}

export default async function Page() {
  const locale = await resolveRequestLocale();
  const t = createT(locale);

  return (
    <>
      <PageHero
        eyebrow={t("marketing.pages.commissions.eyebrow")}
        icon={BadgeCheck}
        title={t("marketing.pages.commissions.title")}
        subtitle={t("marketing.pages.commissions.subtitle")}
      />
      <ProblemSolutionGrid
        title={t("marketing.pages.commissions.gridTitle")}
        subtitle={t("marketing.pages.commissions.gridSubtitle")}
        items={pairs(t)}
      />
      <RelatedLinks
        title={t("marketing.anchors.related")}
        items={[
          { href: "/za-agencije", label: t("marketing.anchors.agencies") },
          { href: "/za-investitore", label: t("marketing.anchors.investors") },
          { href: "/prodaja-novogradnje", label: t("marketing.anchors.newBuild") },
        ]}
      />
      <RelatedReading slugs={["provizije-agencija-za-novogradnju", "cenovnik-stana-u-evrima"]} />
      <CtaPanel />
      <LandingJsonLd
        slug="provizije-agencija"
        title={t("marketing.pages.commissions.metaTitle")}
        description={t("marketing.pages.commissions.metaDescription")}
        locale={locale}
      />
    </>
  );
}
