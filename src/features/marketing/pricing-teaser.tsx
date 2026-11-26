"use client";

import { ArrowRight, Check, Sparkles } from "lucide-react";

import { marketingCta } from "@/features/marketing/marketing-cta";
import { SectionHeading } from "@/features/marketing/ui";
import { useT } from "@/components/app/i18n-provider";
import { cn } from "@/lib/utils";
import type { TranslationKey } from "@/lib/i18n";

const PLANS: Array<{
  nameKey: TranslationKey;
  descKey: TranslationKey;
  price: string;
  featured?: boolean;
  highlights: TranslationKey[];
}> = [
  {
    nameKey: "marketing.pricing.starterName",
    descKey: "marketing.pricing.starterDescription",
    price: "€49",
    highlights: [
      "marketing.pricing.starter1",
      "marketing.pricing.starter2",
      "marketing.pricing.starter3",
      "marketing.pricing.starter4",
    ],
  },
  {
    nameKey: "marketing.pricing.growthName",
    descKey: "marketing.pricing.growthDescription",
    price: "€149",
    featured: true,
    highlights: [
      "marketing.pricing.growth1",
      "marketing.pricing.growth2",
      "marketing.pricing.growth3",
      "marketing.pricing.growth4",
    ],
  },
  {
    nameKey: "marketing.pricing.scaleName",
    descKey: "marketing.pricing.scaleDescription",
    price: "€399",
    highlights: [
      "marketing.pricing.scale1",
      "marketing.pricing.scale2",
      "marketing.pricing.scale3",
      "marketing.pricing.scale4",
    ],
  },
];

export function PricingTeaser() {
  const t = useT();

  return (
    <section id="cenovnik" aria-labelledby="pricing-title" className="relative scroll-mt-20">
      <div aria-hidden className="pd-grid pd-fade-radial pointer-events-none absolute inset-0" />
      <div className="container-app relative py-20 sm:py-28">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <SectionHeading
            id="pricing-title"
            eyebrow={t("marketing.pricing.eyebrow")}
            title={t("marketing.pricing.title")}
            subtitle={t("marketing.pricing.subtitle")}
          />
          <div className="border-tide/40 bg-tide-50 text-ink inline-flex flex-none items-center gap-2 self-start rounded-xl border px-3.5 py-2 text-sm font-semibold lg:self-end">
            <Sparkles aria-hidden className="text-tide-700 size-4" />
            {t("marketing.pricing.earlyBird")}
          </div>
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {PLANS.map((plan, index) => (
            <article
              key={plan.nameKey}
              data-reveal=""
              style={{ "--pd-delay": `${index * 90}ms` } as React.CSSProperties}
              className={cn(
                "relative flex flex-col overflow-hidden rounded-3xl border p-6 sm:p-8",
                plan.featured
                  ? "border-ink bg-ink text-white shadow-[0_28px_50px_-34px_rgba(10,27,61,0.7)]"
                  : "border-line text-ink bg-white",
              )}
            >
              {plan.featured ? (
                <>
                  <div
                    aria-hidden
                    className="pd-grid pd-grid-dark pointer-events-none absolute inset-0"
                  />
                  <div aria-hidden className="bg-tide-300 absolute inset-x-0 top-0 h-1" />
                </>
              ) : null}
              <div className="relative flex items-center justify-between gap-3">
                <h3 className="text-xl font-bold tracking-[-0.025em]">{t(plan.nameKey)}</h3>
                {plan.featured ? (
                  <span className="bg-tide-300 text-ink-950 rounded-md px-2 py-1 font-mono text-[10px] font-medium tracking-[0.1em] uppercase">
                    {t("marketing.pricing.popular")}
                  </span>
                ) : null}
              </div>
              <p
                className={cn(
                  "relative mt-1.5 text-sm leading-relaxed",
                  plan.featured ? "text-white/65" : "text-mute",
                )}
              >
                {t(plan.descKey)}
              </p>
              <div className="relative mt-8 flex items-baseline gap-2">
                <span className="text-[3.25rem] leading-none font-bold tracking-[-0.05em] tabular-nums">
                  {plan.price}
                </span>
                <span className={cn("text-sm", plan.featured ? "text-white/55" : "text-faint")}>
                  {t("marketing.pricing.monthly")}
                </span>
              </div>
              <ul
                className={cn(
                  "relative mt-8 border-t text-sm",
                  plan.featured ? "border-white/10" : "border-line",
                )}
              >
                {plan.highlights.map((h) => (
                  <li
                    key={h}
                    className={cn(
                      "flex items-center gap-3 border-b py-3",
                      plan.featured ? "border-white/10" : "border-line",
                    )}
                  >
                    <Check
                      aria-hidden
                      strokeWidth={2.5}
                      className={cn(
                        "size-4 flex-none",
                        plan.featured ? "text-tide-300" : "text-tide",
                      )}
                    />
                    <span>{t(h)}</span>
                  </li>
                ))}
              </ul>
              <div className="relative mt-auto pt-8">
                <a
                  href="#zakazivanje"
                  className={marketingCta(plan.featured ? "accent" : "outline", "md", "w-full")}
                >
                  {t("marketing.common.bookDemo")}
                  <ArrowRight aria-hidden className="size-4" />
                </a>
              </div>
            </article>
          ))}
        </div>

        <p className="text-faint mt-6 text-center text-xs">{t("marketing.pricing.footnote")}</p>
      </div>
    </section>
  );
}
