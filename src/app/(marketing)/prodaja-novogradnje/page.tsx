import type { Metadata } from "next";
import { LayoutGrid } from "lucide-react";

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
  return [1, 2, 3, 4].map((n) => ({
    problem: t(`marketing.pages.newBuild.p${n}` as `marketing.pages.newBuild.p1`),
    solution: t(`marketing.pages.newBuild.s${n}` as `marketing.pages.newBuild.s1`),
  }));
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await resolveRequestLocale();
  const t = createT(locale);
  return buildLandingMetadata({
    slug: "prodaja-novogradnje",
    title: t("marketing.pages.newBuild.metaTitle"),
    description: t("marketing.pages.newBuild.metaDescription"),
    locale,
  });
}

export default async function Page() {
  const locale = await resolveRequestLocale();
  const t = createT(locale);

  return (
    <>
      <PageHero
        eyebrow={t("marketing.pages.newBuild.eyebrow")}
        icon={LayoutGrid}
        title={t("marketing.pages.newBuild.title")}
        subtitle={t("marketing.pages.newBuild.subtitle")}
      />
      <ProblemSolutionGrid
        title={t("marketing.pages.newBuild.gridTitle")}
        subtitle={t("marketing.pages.newBuild.gridSubtitle")}
        items={pairs(t)}
      />
      <FeatureGrid />
      <CtaPanel />
      <LandingJsonLd
        slug="prodaja-novogradnje"
        title={t("marketing.pages.newBuild.metaTitle")}
        description={t("marketing.pages.newBuild.metaDescription")}
        locale={locale}
      />
    </>
  );
}
