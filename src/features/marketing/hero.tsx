"use client";

import Link from "next/link";
import { ArrowRight, FileClock, Lock, MapPin, ShieldCheck } from "lucide-react";

import { APP_NAME, DEMO_APP_URL, LANDING_IMAGES } from "@/lib/constants/app";
import { marketingCta } from "@/features/marketing/marketing-cta";
import { BrowserFrame, PhoneFrame } from "@/features/marketing/mockup-frame";
import { useT } from "@/components/app/i18n-provider";

/**
 * Opening band. Headline on drafting paper, then the product itself:
 * a real reservations board in a drawn window, with the phone view
 * leaning on its corner.
 */
export function Hero() {
  const t = useT();
  const facts = [
    { icon: ShieldCheck, label: t("marketing.proof.dataEu") },
    { icon: Lock, label: t("marketing.proof.encryption") },
    { icon: FileClock, label: t("marketing.proof.audit") },
    { icon: MapPin, label: t("marketing.footer.madeFor") },
  ];

  return (
    <section className="relative overflow-hidden" aria-labelledby="hero-title">
      <div aria-hidden className="pd-grid pd-fade-radial pointer-events-none absolute inset-0" />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-48 left-1/2 h-[38rem] w-[72rem] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(11,154,162,0.17),transparent)]"
      />

      <div className="container-app relative pt-12 sm:pt-16 lg:pt-20">
        <div className="mx-auto max-w-4xl text-center">
          <p className="pd-rise border-line text-mute inline-flex max-w-full items-center gap-2.5 rounded-full border bg-white py-1 pr-3.5 pl-1 text-[0.8rem] font-medium shadow-[0_6px_16px_-12px_rgba(10,27,61,0.5)]">
            <span className="bg-ink text-tide-300 rounded-full px-2.5 py-1 font-mono text-[10px] font-medium tracking-[0.12em] uppercase">
              {t("marketing.hero.launchBadge")}
            </span>
            <span className="truncate">{t("marketing.hero.earlyAccessBadge")}</span>
          </p>

          <h1
            id="hero-title"
            className="pd-rise text-ink mt-7 text-[2.55rem] leading-[1.02] font-bold tracking-[-0.045em] text-balance sm:text-6xl lg:text-[4.6rem]"
            style={{ animationDelay: "70ms" }}
          >
            {t("marketing.hero.title")}
          </h1>

          <p
            className="pd-rise text-mute mx-auto mt-6 max-w-2xl text-base leading-relaxed text-pretty sm:text-lg"
            style={{ animationDelay: "140ms" }}
          >
            {t("marketing.hero.subtitle")}
          </p>

          <div
            className="pd-rise mt-9 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center"
            style={{ animationDelay: "210ms" }}
          >
            <a href={DEMO_APP_URL} className={marketingCta("ink", "lg", "w-full sm:w-auto")}>
              {t("marketing.header.openDemo")}
              <ArrowRight aria-hidden className="size-4" />
            </a>
            <Link href="/demo" className={marketingCta("outline", "lg", "w-full sm:w-auto")}>
              {t("marketing.hero.bookDemo")}
            </Link>
          </div>

          <p className="pd-rise text-faint mt-4 text-sm" style={{ animationDelay: "270ms" }}>
            {t("marketing.hero.noObligation")}
          </p>
        </div>

        <div
          className="pd-rise relative mx-auto mt-12 max-w-[1080px] sm:mt-16 lg:pr-10 lg:pb-12"
          style={{ animationDelay: "260ms" }}
        >
          <div
            aria-hidden
            className="bg-tide/20 absolute inset-x-10 -bottom-6 h-40 rounded-full blur-3xl lg:bottom-6"
          />
          <BrowserFrame
            screen={LANDING_IMAGES.screens.reservations}
            alt={`${APP_NAME} — ${t("marketing.features.items.reservations.title")}`}
            sizes="(min-width: 1152px) 1040px, 94vw"
            priority
            className="relative hidden sm:block"
          />
          {/* On a phone the whole window would be unreadable: show the board itself. */}
          <BrowserFrame
            screen={LANDING_IMAGES.screens.reservations}
            alt={`${APP_NAME} — ${t("marketing.features.items.reservations.title")}`}
            sizes="190vw"
            crop="aspect-[10/9]"
            detail
            className="relative sm:hidden"
          />
          <PhoneFrame
            screen={LANDING_IMAGES.screens.mobile}
            alt={t("marketing.personas.mobileAlt")}
            sizes="210px"
            className="absolute right-0 bottom-0 hidden w-[210px] lg:block"
          />
        </div>

        <ul className="border-line mt-12 grid grid-cols-2 border-t sm:mt-16 lg:grid-cols-4">
          {facts.map((fact, index) => {
            const Icon = fact.icon;
            return (
              <li
                key={fact.label}
                className={
                  "text-mute border-line flex items-center gap-2.5 py-5 text-[0.82rem] leading-snug font-medium sm:py-6 " +
                  (index % 2 === 1 ? "border-l pl-4 sm:pl-6 " : "pr-4 ") +
                  (index >= 2 ? "border-t lg:border-t-0 " : "") +
                  (index === 2 ? "lg:border-l lg:pl-6" : "")
                }
              >
                <Icon aria-hidden className="text-tide-700 size-4 flex-none" strokeWidth={1.75} />
                <span>{fact.label}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
