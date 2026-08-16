import type { Metadata } from "next";
import { Handshake } from "lucide-react";

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
  return [1, 2, 3, 4, 5, 6].map((n) => ({
    problem: t(`marketing.pages.agencies.p${n}` as `marketing.pages.agencies.p1`),
    solution: t(`marketing.pages.agencies.s${n}` as `marketing.pages.agencies.s1`),
  }));
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await resolveRequestLocale();
  const t = createT(locale);
  return buildLandingMetadata({
    slug: "za-agencije",
    title: t("marketing.pages.agencies.metaTitle"),
    description: t("marketing.pages.agencies.metaDescription"),
    locale,
  });
}

export default async function Page() {
  const locale = await resolveRequestLocale();
  const t = createT(locale);

  return (
    <>
      <PageHero
        eyebrow={t("marketing.pages.agencies.eyebrow")}
        icon={Handshake}
        title={t("marketing.pages.agencies.title")}
        subtitle={t("marketing.pages.agencies.subtitle")}
      />
      <ProblemSolutionGrid
        title={t("marketing.pages.agencies.gridTitle")}
        subtitle={t("marketing.pages.agencies.gridSubtitle")}
        items={pairs(t)}
      />
      <CtaPanel
        title={t("marketing.pages.agencies.ctaTitle")}
        subtitle={t("marketing.pages.agencies.ctaSubtitle")}
      />
      <LandingJsonLd
        slug="za-agencije"
        title={t("marketing.pages.agencies.metaTitle")}
        description={t("marketing.pages.agencies.metaDescription")}
        locale={locale}
      />
    </>
  );
}
