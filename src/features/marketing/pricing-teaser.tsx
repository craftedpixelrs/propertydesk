"use client";

import { Check, Sparkles } from "lucide-react";

import { marketingCta } from "@/features/marketing/marketing-cta";
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
    <section
      id="cenovnik"
      aria-labelledby="pricing-title"
      className="scroll-mt-20 border-t border-[#0b1020]/10 bg-white"
    >
      <div className="container-app py-16 sm:py-20">
        <div className="max-w-3xl">
          <div className="text-xs font-semibold tracking-[0.18em] text-[#9a7430] uppercase">
            {t("marketing.pricing.eyebrow")}
          </div>
          <h2
            id="pricing-title"
            className="font-display mt-3 text-4xl font-semibold tracking-tight text-[#0b1020] sm:text-5xl"
          >
            {t("marketing.pricing.title")}
          </h2>
          <p className="mt-4 text-base leading-relaxed text-[var(--color-foreground-muted)]">
            {t("marketing.pricing.subtitle")}
          </p>

          <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-[#d6b26a]/50 bg-[#f7f3ea] px-3 py-1.5 text-sm font-medium text-[#0b1020]">
            <Sparkles aria-hidden className="size-4" />
            {t("marketing.pricing.earlyBird")}
          </div>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {PLANS.map((plan, index) => (
            <article
              key={plan.nameKey}
              data-reveal={plan.featured ? "fade" : ""}
              style={{ "--pd-delay": `${index * 90}ms` } as React.CSSProperties}
              className={cn(
                "relative flex flex-col rounded-3xl border p-6",
                plan.featured
                  ? "border-[#0b1020] bg-[#0b1020] text-[#f7f3ea] shadow-[0_24px_60px_-32px_rgba(11,16,32,0.8)] md:-translate-y-3"
                  : "border-[var(--color-border)] bg-[var(--color-surface)]",
              )}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-display text-2xl font-semibold">{t(plan.nameKey)}</h3>
                {plan.featured ? (
                  <span className="rounded-full bg-[#d6b26a] px-2 py-0.5 text-[10px] font-semibold tracking-wide text-[#0b1020] uppercase">
                    {t("marketing.pricing.popular")}
                  </span>
                ) : null}
              </div>
              <p
                className={cn(
                  "mt-1 text-sm",
                  plan.featured ? "text-white/65" : "text-[var(--color-foreground-muted)]",
                )}
              >
                {t(plan.descKey)}
              </p>
              <div className="mt-5 flex items-baseline gap-1.5">
                <span className="font-display text-5xl font-semibold tracking-tight tabular-nums">
                  {plan.price}
                </span>
                <span
                  className={cn(
                    "text-sm",
                    plan.featured ? "text-white/55" : "text-[var(--color-foreground-muted)]",
                  )}
                >
                  {t("marketing.pricing.monthly")}
                </span>
              </div>
              <ul className="mt-5 space-y-2.5 text-sm">
                {plan.highlights.map((h) => (
                  <li key={h} className="flex items-start gap-2.5">
                    <Check
                      aria-hidden
                      className={cn(
                        "mt-0.5 size-4 flex-none",
                        plan.featured ? "text-[#d6b26a]" : "text-[var(--color-success)]",
                      )}
                    />
                    <span>{t(h)}</span>
                  </li>
                ))}
              </ul>
              <div
                className={cn(
                  "mt-6 border-t pt-6",
                  plan.featured ? "border-white/10" : "border-[var(--color-border)]",
                )}
              >
                <a
                  href="#zakazivanje"
                  className={marketingCta(plan.featured ? "cream" : "outline", "md", "w-full")}
                >
                  {t("marketing.common.bookDemo")}
                </a>
              </div>
            </article>
          ))}
        </div>

        <p className="mt-6 text-center text-xs text-[var(--color-foreground-subtle)]">
          {t("marketing.pricing.footnote")}
        </p>
      </div>
    </section>
  );
}
