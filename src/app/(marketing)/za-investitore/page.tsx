import type { Metadata } from "next";
import { Building2 } from "lucide-react";

import { PageHero } from "@/features/marketing/landing/page-hero";
import { ProblemSolutionGrid } from "@/features/marketing/landing/problem-solution-grid";
import { CtaPanel } from "@/features/marketing/landing/cta-panel";
import { FeatureGrid } from "@/features/marketing/feature-grid";
import {
  buildLandingMetadata,
  LandingJsonLd,
} from "@/features/marketing/landing/landing-shell";
import { createT, type TranslateFn } from "@/lib/i18n";
import { resolveRequestLocale } from "@/lib/i18n/resolve-locale";

function pairs(t: TranslateFn) {
  return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => ({
    problem: t(`marketing.pages.investors.p${n}` as `marketing.pages.investors.p1`),
    solution: t(`marketing.pages.investors.s${n}` as `marketing.pages.investors.s1`),
  }));
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await resolveRequestLocale();
  const t = createT(locale);
  return buildLandingMetadata({
    slug: "za-investitore",
    title: t("marketing.pages.investors.metaTitle"),
    description: t("marketing.pages.investors.metaDescription"),
    locale,
  });
}

export default async function Page() {
  const locale = await resolveRequestLocale();
  const t = createT(locale);

  return (
    <>
      <PageHero
        eyebrow={t("marketing.pages.investors.eyebrow")}
        icon={Building2}
        title={t("marketing.pages.investors.title")}
        subtitle={t("marketing.pages.investors.subtitle")}
      />
      <ProblemSolutionGrid
        title={t("marketing.pages.investors.gridTitle")}
        subtitle={t("marketing.pages.investors.gridSubtitle")}
        items={pairs(t)}
      />
      <FeatureGrid />
      <CtaPanel />
      <LandingJsonLd
        slug="za-investitore"
        title={t("marketing.pages.investors.metaTitle")}
        description={t("marketing.pages.investors.metaDescription")}
        locale={locale}
      />
    </>
  );
}
