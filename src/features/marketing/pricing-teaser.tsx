"use client";

import { Check, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
      className="scroll-mt-20 border-t border-[var(--color-border)]"
    >
      <div className="container-app py-16 sm:py-20">
        <div className="max-w-3xl">
          <div className="text-xs font-semibold uppercase tracking-wider text-[var(--color-brand-700)]">
            {t("marketing.pricing.eyebrow")}
          </div>
          <h2
            id="pricing-title"
            className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl"
          >
            {t("marketing.pricing.title")}
          </h2>
          <p className="mt-4 text-base leading-relaxed text-[var(--color-foreground-muted)]">
            {t("marketing.pricing.subtitle")}
          </p>

          <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-[var(--color-brand-200)] bg-[var(--color-brand-50)] px-3 py-1.5 text-sm font-medium text-[var(--color-brand-700)]">
            <Sparkles aria-hidden className="size-4" />
            {t("marketing.pricing.earlyBird")}
          </div>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {PLANS.map((plan) => (
            <article
              key={plan.nameKey}
              className={cn(
                "flex flex-col rounded-2xl border bg-[var(--color-surface)] p-6 shadow-sm",
                plan.featured
                  ? "border-[var(--color-brand-600)] ring-2 ring-[var(--color-brand-600)]/20"
                  : "border-[var(--color-border)]",
              )}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold">{t(plan.nameKey)}</h3>
                {plan.featured ? (
                  <Badge tone="brand">{t("marketing.pricing.popular")}</Badge>
                ) : null}
              </div>
              <p className="mt-1 text-sm text-[var(--color-foreground-muted)]">
                {t(plan.descKey)}
              </p>
              <div className="mt-5 flex items-baseline gap-1.5">
                <span className="text-4xl font-extrabold tracking-tight">
                  {plan.price}
                </span>
                <span className="text-sm text-[var(--color-foreground-muted)]">
                  {t("marketing.pricing.monthly")}
                </span>
              </div>
              <ul className="mt-5 space-y-2.5 text-sm">
                {plan.highlights.map((h) => (
                  <li key={h} className="flex items-start gap-2.5">
                    <Check
                      aria-hidden
                      className="mt-0.5 size-4 flex-none text-[var(--color-success)]"
                    />
                    <span>{t(h)}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-6 pt-6 border-t border-[var(--color-border)]">
                <Button
                  asChild
                  size="md"
                  variant={plan.featured ? "primary" : "outline"}
                  className="w-full"
                >
                  <a href="#zakazivanje">{t("marketing.common.bookDemo")}</a>
                </Button>
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
