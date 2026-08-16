import type { Metadata } from "next";
import { Contact } from "lucide-react";

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
  return [1, 2, 3, 4].map((n) => ({
    problem: t(`marketing.pages.crm.p${n}` as `marketing.pages.crm.p1`),
    solution: t(`marketing.pages.crm.s${n}` as `marketing.pages.crm.s1`),
  }));
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await resolveRequestLocale();
  const t = createT(locale);
  return buildLandingMetadata({
    slug: "crm-za-investitore",
    title: t("marketing.pages.crm.metaTitle"),
    description: t("marketing.pages.crm.metaDescription"),
    locale,
  });
}

export default async function Page() {
  const locale = await resolveRequestLocale();
  const t = createT(locale);

  return (
    <>
      <PageHero
        eyebrow={t("marketing.pages.crm.eyebrow")}
        icon={Contact}
        title={t("marketing.pages.crm.title")}
        subtitle={t("marketing.pages.crm.subtitle")}
      />
      <ProblemSolutionGrid
        title={t("marketing.pages.crm.gridTitle")}
        subtitle={t("marketing.pages.crm.gridSubtitle")}
        items={pairs(t)}
      />
      <CtaPanel />
      <LandingJsonLd
        slug="crm-za-investitore"
        title={t("marketing.pages.crm.metaTitle")}
        description={t("marketing.pages.crm.metaDescription")}
        locale={locale}
      />
    </>
  );
}
