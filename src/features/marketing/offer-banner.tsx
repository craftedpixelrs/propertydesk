"use client";

import { CalendarClock, Percent, Lock } from "lucide-react";

import { useT } from "@/components/app/i18n-provider";

/**
 * Compact "why sign up now" strip between hero and features.
 */
export function OfferBanner() {
  const t = useT();
  const items = [
    {
      icon: CalendarClock,
      title: t("marketing.offer.trialTitle"),
      body: t("marketing.offer.trialBody"),
    },
    {
      icon: Percent,
      title: t("marketing.offer.discountTitle"),
      body: t("marketing.offer.discountBody"),
    },
    {
      icon: Lock,
      title: t("marketing.offer.lockTitle"),
      body: t("marketing.offer.lockBody"),
    },
  ];

  return (
    <section
      aria-labelledby="offer-title"
      className="relative z-10 border-y border-[#0b1020]/10 bg-[#f7f3ea]"
    >
      <div className="container-app py-8 sm:py-10">
        <h2 id="offer-title" className="sr-only">
          {t("marketing.offer.title")}
        </h2>
        <div className="grid gap-8 sm:grid-cols-3 sm:gap-6">
          {items.map((it, index) => {
            const Icon = it.icon;
            return (
              <div
                key={it.title}
                data-reveal=""
                style={{ "--pd-delay": `${index * 90}ms` } as React.CSSProperties}
                className="flex gap-4"
              >
                <span aria-hidden className="font-display text-3xl leading-none text-[#9a7430]">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div>
                  <div className="flex items-center gap-2 text-base font-semibold text-[var(--color-foreground)]">
                    <Icon aria-hidden className="size-4 text-[#9a7430]" />
                    {it.title}
                  </div>
                  <p className="mt-1.5 text-sm leading-relaxed text-[var(--color-foreground-muted)]">
                    {it.body}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
