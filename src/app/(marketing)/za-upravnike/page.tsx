import type { Metadata } from "next";
import { Building2, CalendarDays, FileCheck, Receipt } from "lucide-react";

import { PageHero } from "@/features/marketing/landing/page-hero";
import { ProblemSolutionGrid } from "@/features/marketing/landing/problem-solution-grid";
import { RelatedLinks } from "@/features/marketing/landing/related-links";
import { CtaPanel } from "@/features/marketing/landing/cta-panel";
import { Index, SectionHeading } from "@/features/marketing/ui";
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
        screen="manager"
      />

      <ProblemSolutionGrid
        title={t("marketing.pages.managers.gridTitle")}
        subtitle={t("marketing.pages.managers.gridSubtitle")}
        items={pairs(t)}
      />

      <section aria-labelledby="managers-flow-title" className="border-line border-t">
        <div className="container-app py-20 sm:py-28">
          <SectionHeading
            id="managers-flow-title"
            title={t("marketing.pages.managers.flowTitle")}
            subtitle={t("marketing.pages.managers.flowSubtitle")}
          />
          <ol className="relative mt-14 grid gap-4 md:grid-cols-3">
            {flow.map((step, i) => {
              const Icon = step.icon;
              return (
                <li
                  key={step.title}
                  data-reveal=""
                  style={{ "--pd-delay": `${i * 90}ms` } as React.CSSProperties}
                  className="border-line relative flex flex-col rounded-3xl border bg-white p-6 sm:p-8"
                >
                  <div className="flex items-center justify-between">
                    <span
                      aria-hidden
                      className={
                        i === 0
                          ? "bg-ink text-tide-300 grid size-11 place-items-center rounded-xl"
                          : "border-line text-tide-700 grid size-11 place-items-center rounded-xl border bg-white"
                      }
                    >
                      <Icon className="size-5" strokeWidth={1.75} />
                    </span>
                    <Index n={i + 1} />
                  </div>
                  <h3 className="text-ink mt-7 text-xl leading-snug font-bold tracking-[-0.025em]">
                    {step.title}
                  </h3>
                  <p className="text-mute mt-2.5 text-sm leading-relaxed">{step.body}</p>
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
