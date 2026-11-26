"use client";

import { CalendarClock, Percent, Lock } from "lucide-react";

import { useT } from "@/components/app/i18n-provider";
import { Index } from "@/features/marketing/ui";

/**
 * The offer for new clients, as a navy band right under the hero.
 * Three plain terms, ruled apart like a spec sheet.
 */
export function OfferBanner() {
  const t = useT();
  const items = [
    {
      icon: Percent,
      title: t("marketing.offer.trialTitle"),
      body: t("marketing.offer.trialBody"),
    },
    {
      icon: CalendarClock,
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
    <section aria-labelledby="offer-title" className="bg-ink-950 relative overflow-hidden">
      <div aria-hidden className="pd-grid pd-grid-dark pointer-events-none absolute inset-0" />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-0 h-80 w-[40rem] rounded-full bg-[radial-gradient(closest-side,rgba(95,210,216,0.16),transparent)]"
      />
      <div className="container-app relative py-12 sm:py-14">
        <div className="flex items-center gap-3">
          <span aria-hidden className="bg-tide-300 size-1.5 rounded-full" />
          <h2
            id="offer-title"
            className="text-tide-300 font-mono text-[11px] font-medium tracking-[0.16em] uppercase"
          >
            {t("marketing.offer.title")}
          </h2>
          <span aria-hidden className="h-px flex-1 bg-white/10" />
        </div>
        <div className="mt-8 grid gap-8 md:grid-cols-3 md:gap-0 md:divide-x md:divide-white/10">
          {items.map((it, index) => {
            const Icon = it.icon;
            return (
              <div
                key={it.title}
                data-reveal=""
                style={{ "--pd-delay": `${index * 90}ms` } as React.CSSProperties}
                className="md:px-8 md:first:pl-0 md:last:pr-0"
              >
                <div className="flex items-center justify-between">
                  <Index n={index + 1} tone="dark" />
                  <Icon aria-hidden className="size-4 text-white/35" strokeWidth={1.75} />
                </div>
                <h3 className="mt-4 text-xl leading-tight font-bold tracking-[-0.025em] text-white sm:text-2xl">
                  {it.title}
                </h3>
                <p className="mt-2.5 text-sm leading-relaxed text-white/60">{it.body}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
