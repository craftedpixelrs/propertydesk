import type { Metadata } from "next";
import { FileSpreadsheet } from "lucide-react";

import { PageHero } from "@/features/marketing/landing/page-hero";
import { ProblemSolutionGrid } from "@/features/marketing/landing/problem-solution-grid";
import { CtaPanel } from "@/features/marketing/landing/cta-panel";
import {
  buildLandingMetadata,
  LandingJsonLd,
} from "@/features/marketing/landing/landing-shell";
import { createT, type TranslateFn } from "@/lib/i18n";
import { resolveRequestLocale } from "@/lib/i18n/resolve-locale";

function pairs(t: TranslateFn) {
  return [1, 2, 3, 4, 5].map((n) => ({
    problem: t(`marketing.pages.excel.p${n}` as `marketing.pages.excel.p1`),
    solution: t(`marketing.pages.excel.s${n}` as `marketing.pages.excel.s1`),
  }));
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await resolveRequestLocale();
  const t = createT(locale);
  return buildLandingMetadata({
    slug: "alternative-excelu",
    title: t("marketing.pages.excel.metaTitle"),
    description: t("marketing.pages.excel.metaDescription"),
    locale,
  });
}

export default async function Page() {
  const locale = await resolveRequestLocale();
  const t = createT(locale);

  return (
    <>
      <PageHero
        eyebrow={t("marketing.pages.excel.eyebrow")}
        icon={FileSpreadsheet}
        title={t("marketing.pages.excel.title")}
        subtitle={t("marketing.pages.excel.subtitle")}
      />
      <ProblemSolutionGrid
        title={t("marketing.pages.excel.gridTitle")}
        subtitle={t("marketing.pages.excel.gridSubtitle")}
        items={pairs(t)}
      />
      <CtaPanel
        title={t("marketing.pages.excel.ctaTitle")}
        subtitle={t("marketing.pages.excel.ctaSubtitle")}
      />
      <LandingJsonLd
        slug="alternative-excelu"
        title={t("marketing.pages.excel.metaTitle")}
        description={t("marketing.pages.excel.metaDescription")}
        locale={locale}
      />
    </>
  );
}
