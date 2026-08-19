"use client";

import { Rocket, ArrowRight } from "lucide-react";

import {
  LANDING_IMAGES,
  LAUNCH_DATE_ISO,
  LAUNCH_DATE_LABEL,
} from "@/lib/constants/app";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MockupFrame } from "@/features/marketing/mockup-frame";
import { Countdown } from "@/features/marketing/countdown";
import { useT } from "@/components/app/i18n-provider";

/**
 * Hero section - first thing anonymous visitors see.
 *
 * The CTA hierarchy targets fast-moving B2B qualified visitors:
 *   - Primary   → `#zakazivanje` (Google Calendar Appointment embed on the
 *                 same page + on the dedicated `/demo` route)
 *
 * Login is intentionally NOT in the hero - it lives in the top-right
 * header only, and is disabled until 01.09.2026 anyway.
 */
export function Hero() {
  const t = useT();

  return (
    <section
      className="relative overflow-hidden"
      aria-labelledby="hero-title"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-[var(--color-brand-50)]/70 via-white to-white"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 left-1/2 -z-10 h-72 w-[36rem] -translate-x-1/2 rounded-full bg-[var(--color-brand-200)]/40 blur-3xl"
      />

      <div className="container-app grid gap-10 py-12 sm:py-20 lg:grid-cols-[minmax(0,6fr)_minmax(0,6fr)] lg:gap-14 lg:py-24">
        <div className="max-w-2xl">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="brand" className="gap-1.5">
              <Rocket aria-hidden className="size-3.5" />
              {t("marketing.hero.launchBadge", { date: LAUNCH_DATE_LABEL })}
            </Badge>
            <Badge tone="success">{t("marketing.hero.earlyAccessBadge")}</Badge>
          </div>

          <h1
            id="hero-title"
            className="mt-5 text-balance text-3xl font-extrabold leading-[1.1] tracking-tight text-[var(--color-foreground)] sm:text-5xl lg:text-6xl"
          >
            {t("marketing.hero.title")}
          </h1>

          <p className="mt-4 max-w-xl text-pretty text-base leading-relaxed text-[var(--color-foreground-muted)] sm:mt-5 sm:text-lg">
            {t("marketing.hero.subtitle")}
          </p>

          <div className="mt-7 flex flex-col items-stretch gap-3 sm:mt-8 sm:flex-row sm:items-center">
            <Button asChild size="lg" className="w-full sm:w-auto">
              <a href="#zakazivanje">
                {t("marketing.hero.bookDemo")}
                <ArrowRight aria-hidden className="size-4" />
              </a>
            </Button>
          </div>

          <p className="mt-4 text-xs text-[var(--color-foreground-subtle)]">
            {t("marketing.hero.noObligation")}
          </p>

          <div className="mt-10">
            <div className="mb-2 text-xs font-medium uppercase tracking-wider text-[var(--color-foreground-subtle)]">
              {t("marketing.hero.countdownLabel")}
            </div>
            <Countdown targetIso={LAUNCH_DATE_ISO} className="max-w-md" />
          </div>
        </div>

        <div className="flex items-center justify-center lg:justify-end">
          <MockupFrame
            variant="desktop"
            src={LANDING_IMAGES.heroDesktop?.src}
            width={LANDING_IMAGES.heroDesktop?.width}
            height={LANDING_IMAGES.heroDesktop?.height}
            alt={t("marketing.hero.mockupAlt")}
            priority
          />
        </div>
      </div>
    </section>
  );
}
