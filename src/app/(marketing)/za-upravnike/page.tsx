import type { Metadata } from "next";
import { Building2, CalendarDays, FileCheck, Receipt } from "lucide-react";

import { PageHero } from "@/features/marketing/landing/page-hero";
import { ProblemSolutionGrid } from "@/features/marketing/landing/problem-solution-grid";
import { RelatedLinks } from "@/features/marketing/landing/related-links";
import { CtaPanel } from "@/features/marketing/landing/cta-panel";
import { buildLandingMetadata, LandingJsonLd } from "@/features/marketing/landing/landing-shell";
import { createT, type TranslateFn } from "@/lib/i18n";
import { resolveRequestLocale } from "@/lib/i18n/resolve-locale";

/**
 * Faza 11 landing: `/za-upravnike`. Mirrors the layout of
 * `/za-investitore` (10 problem-solution pairs) and adds a
 * three-step "monthly flow" block so a prospective manager can
 * see on one page what day 1 / mid-month / end of month looks
 * like in PropertyDesk.
 */
function pairs(t: TranslateFn) {
  return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => ({
    problem: t(`marketing.pages.managers.p${n}` as `marketing.pages.managers.p1`),
    solution: t(`marketing.pages.managers.s${n}` as `marketing.pages.managers.s1`),
  }));
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await resolveRequestLocale();
  const t = createT(locale);
  return buildLandingMetadata({
    slug: "za-upravnike",
    title: t("marketing.pages.managers.metaTitle"),
    description: t("marketing.pages.managers.metaDescription"),
    locale,
  });
}

export default async function Page() {
  const locale = await resolveRequestLocale();
  const t = createT(locale);

  const flow = [
    {
      icon: Receipt,
      title: t("marketing.pages.managers.flow1Title"),
      body: t("marketing.pages.managers.flow1Body"),
    },
    {
      icon: FileCheck,
      title: t("marketing.pages.managers.flow2Title"),
      body: t("marketing.pages.managers.flow2Body"),
    },
    {
      icon: CalendarDays,
      title: t("marketing.pages.managers.flow3Title"),
      body: t("marketing.pages.managers.flow3Body"),
    },
  ];

  return (
    <>
      <PageHero
        eyebrow={t("marketing.pages.managers.eyebrow")}
        icon={Building2}
        title={t("marketing.pages.managers.title")}
        subtitle={t("marketing.pages.managers.subtitle")}
      />

      <ProblemSolutionGrid
        title={t("marketing.pages.managers.gridTitle")}
        subtitle={t("marketing.pages.managers.gridSubtitle")}
        items={pairs(t)}
      />

      <section
        aria-labelledby="managers-flow-title"
        className="border-y border-[#0b1020]/10 bg-[#f7f3ea]"
      >
        <div className="container-app py-16 sm:py-20">
          <div className="max-w-3xl">
            <h2
              id="managers-flow-title"
              className="font-display text-4xl font-semibold tracking-tight text-[#0b1020] sm:text-5xl"
            >
              {t("marketing.pages.managers.flowTitle")}
            </h2>
            <p className="mt-4 text-base leading-relaxed text-[var(--color-foreground-muted)]">
              {t("marketing.pages.managers.flowSubtitle")}
            </p>
          </div>
          <ol className="mt-10 grid gap-5 sm:grid-cols-3">
            {flow.map((step, i) => {
              const Icon = step.icon;
              return (
                <li
                  key={step.title}
                  data-reveal=""
                  style={{ "--pd-delay": `${i * 80}ms` } as React.CSSProperties}
                  className="relative flex flex-col gap-3 rounded-2xl border border-[#0b1020]/10 bg-white p-6 shadow-sm"
                >
                  <span
                    aria-hidden
                    className="absolute top-6 right-6 text-[11px] font-semibold tracking-[0.16em] text-[#9a7430] uppercase"
                  >
                    {`0${i + 1}`}
                  </span>
                  <span
                    aria-hidden
                    className="grid size-11 place-items-center rounded-xl bg-[#0b1020] text-[#f3e2bc]"
                  >
                    <Icon className="size-5" strokeWidth={1.75} />
                  </span>
                  <h3 className="font-display text-xl font-semibold tracking-tight text-[#0b1020]">
                    {step.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-[#0b1020]/75">{step.body}</p>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      <RelatedLinks
        title={t("marketing.anchors.related")}
        items={[
          {
            href: "/softver-za-prodaju-novogradnje",
            label: t("marketing.anchors.software"),
          },
          { href: "/za-investitore", label: t("marketing.anchors.investors") },
          { href: "/za-agencije", label: t("marketing.anchors.agencies") },
          { href: "/rezervacije-i-uplate", label: t("marketing.anchors.reservation") },
        ]}
      />

      <CtaPanel
        title={t("marketing.pages.managers.ctaTitle")}
        subtitle={t("marketing.pages.managers.ctaSubtitle")}
      />

      <LandingJsonLd
        slug="za-upravnike"
        title={t("marketing.pages.managers.metaTitle")}
        description={t("marketing.pages.managers.metaDescription")}
        locale={locale}
      />
    </>
  );
}
