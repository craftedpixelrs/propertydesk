"use client";

import { ArrowRight } from "lucide-react";

import { LANDING_IMAGES, LAUNCH_DATE_ISO, LAUNCH_DATE_LABEL } from "@/lib/constants/app";
import { marketingCta } from "@/features/marketing/marketing-cta";
import { MockupFrame } from "@/features/marketing/mockup-frame";
import { Countdown } from "@/features/marketing/countdown";
import { useT } from "@/components/app/i18n-provider";

/**
 * Opening band. Ink background and a serif headline so the landing
 * reads as a property brand, not a generic light SaaS template.
 * Login stays in the header until 15.10.2026.
 */
export function Hero() {
  const t = useT();

  return (
    <section
      className="relative overflow-hidden bg-[#0b1020] text-white"
      aria-labelledby="hero-title"
    >
      <div
        aria-hidden
        className="pd-glow pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(214,178,106,0.28),transparent_48%),radial-gradient(ellipse_at_85%_110%,rgba(214,178,106,0.16),transparent_42%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)] [background-size:72px_72px] opacity-[0.18]"
      />

      <div className="container-app relative grid items-center gap-12 py-16 sm:py-20 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-10 lg:py-24">
        <div className="max-w-2xl">
          <p className="pd-rise inline-flex items-center gap-2 rounded-full border border-[#d6b26a]/40 bg-[#d6b26a]/10 px-3 py-1 text-xs font-semibold tracking-wide text-[#f3e2bc]">
            <span className="size-1.5 rounded-full bg-[#d6b26a]" />
            {t("marketing.hero.launchBadge", { date: LAUNCH_DATE_LABEL })}
          </p>

          <h1
            id="hero-title"
            className="pd-rise font-display mt-6 text-4xl leading-[1.05] font-semibold tracking-[-0.03em] text-balance text-[#f7f3ea] sm:text-6xl lg:text-[4.25rem]"
            style={{ animationDelay: "80ms" }}
          >
            {t("marketing.hero.title")}
          </h1>

          <p
            className="pd-rise mt-5 max-w-xl text-base leading-relaxed text-pretty text-white/70 sm:text-lg"
            style={{ animationDelay: "150ms" }}
          >
            {t("marketing.hero.subtitle")}
          </p>

          <div
            className="pd-rise mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center"
            style={{ animationDelay: "220ms" }}
          >
            <a href="#zakazivanje" className={marketingCta("cream", "lg", "w-full sm:w-auto")}>
              {t("marketing.hero.bookDemo")}
              <ArrowRight aria-hidden className="size-4" />
            </a>
            <a href="#cenovnik" className={marketingCta("quietDark", "lg", "w-full sm:w-auto")}>
              {t("marketing.nav.pricing")}
            </a>
          </div>

          <p className="pd-rise mt-4 text-sm text-[#f3e2bc]/90" style={{ animationDelay: "300ms" }}>
            {t("marketing.hero.earlyAccessBadge")}
          </p>
          <p className="pd-rise mt-1 text-xs text-white/45" style={{ animationDelay: "340ms" }}>
            {t("marketing.hero.noObligation")}
          </p>

          <div className="pd-rise mt-10" style={{ animationDelay: "400ms" }}>
            <div className="mb-3 text-[11px] font-semibold tracking-[0.16em] text-white/45 uppercase">
              {t("marketing.hero.countdownLabel")}
            </div>
            <Countdown targetIso={LAUNCH_DATE_ISO} tone="onDark" className="max-w-md" />
          </div>
        </div>

        <div className="pd-rise relative min-w-0" style={{ animationDelay: "200ms" }}>
          <div
            aria-hidden
            className="absolute -inset-6 -z-10 rounded-[2rem] bg-[#d6b26a]/10 blur-2xl"
          />
          <div className="pd-float rounded-[1.4rem] border border-white/10 bg-white/[0.04] p-2 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.7)] sm:p-3">
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
      </div>
    </section>
  );
}
