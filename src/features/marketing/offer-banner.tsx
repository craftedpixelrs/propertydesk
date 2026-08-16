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
      className="border-y border-[var(--color-border)] bg-[var(--color-surface-muted)]"
    >
      <div className="container-app py-10 sm:py-14">
        <h2 id="offer-title" className="sr-only">
          {t("marketing.offer.title")}
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {items.map((it) => {
            const Icon = it.icon;
            return (
              <div
                key={it.title}
                className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <span
                    aria-hidden
                    className="grid h-10 w-10 place-items-center rounded-lg bg-[var(--color-brand-50)] text-[var(--color-brand-700)]"
                  >
                    <Icon className="size-5" />
                  </span>
                  <div className="text-base font-semibold text-[var(--color-foreground)]">
                    {it.title}
                  </div>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-[var(--color-foreground-muted)]">
                  {it.body}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
