import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, ArrowUpRight, PlayCircle } from "lucide-react";

import { marketingCta } from "@/features/marketing/marketing-cta";
import { BrowserFrame } from "@/features/marketing/mockup-frame";
import { UnitMatrix } from "@/features/marketing/ui";
import { APP_NAME, DEMO_APP_URL, LANDING_IMAGES } from "@/lib/constants/app";
import { createT } from "@/lib/i18n";
import { resolveRequestLocale } from "@/lib/i18n/resolve-locale";

interface PageHeroProps {
  eyebrow: string;
  title: string;
  subtitle: string;
  /** Icon rendered next to the eyebrow. */
  icon?: LucideIcon;
  /** Primary CTA - defaults to demo booking on the /demo page. */
  primaryCta?: { label: string; href: string };
  /** Secondary CTA. Defaults to opening the public demo. */
  secondaryCta?: { label: string; href: string };
  /** Optional footnote rendered below the CTAs. */
  footnote?: string;
  /** A product screen for the right side. Without it, a stock matrix is drawn. */
  screen?: Exclude<keyof typeof LANDING_IMAGES.screens, "mobile">;
}

/**
 * Hero for the topic landing pages (`/za-investitore`, `/za-agencije`,
 * ...). Left: where you are, one H1, one paragraph, the booking CTA.
 * Right: the product screen that page is about, or the stock matrix.
 */
export async function PageHero({
  eyebrow,
  title,
  subtitle,
  icon: Icon,
  primaryCta,
  secondaryCta,
  footnote,
  screen,
}: PageHeroProps) {
  const t = createT(await resolveRequestLocale());
  const resolvedPrimary = primaryCta ?? {
    label: t("marketing.common.bookDemo"),
    href: "/demo#zakazivanje",
  };
  const resolvedFootnote = footnote ?? t("marketing.common.noObligation");

  return (
    <section
      className="border-line relative overflow-hidden border-b"
      aria-labelledby="page-hero-title"
    >
      <div aria-hidden className="pd-grid pd-fade-radial pointer-events-none absolute inset-0" />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-56 right-[-10%] h-[36rem] w-[52rem] rounded-full bg-[radial-gradient(closest-side,rgba(11,154,162,0.16),transparent)]"
      />

      <div className="container-app relative grid items-center gap-12 py-14 sm:py-20 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-14 lg:py-24">
        <div className="pd-rise">
          <p className="text-faint flex flex-wrap items-center gap-2.5 font-mono text-[11px] font-medium tracking-[0.16em] uppercase">
            <Link href="/" className="hover:text-ink transition-colors">
              {t("marketing.landing.home")}
            </Link>
            <span aria-hidden className="text-line">
              /
            </span>
            <span className="text-tide-700 inline-flex items-center gap-1.5">
              {Icon ? <Icon aria-hidden className="size-3.5" strokeWidth={2} /> : null}
              {eyebrow}
            </span>
          </p>
          <h1
            id="page-hero-title"
            className="text-ink mt-6 text-[2.3rem] leading-[1.04] font-bold tracking-[-0.04em] text-balance sm:text-5xl lg:text-[3.4rem]"
          >
            {title}
          </h1>
          <p className="text-mute mt-6 max-w-xl text-base leading-relaxed text-pretty sm:text-lg">
            {subtitle}
          </p>

          <div className="mt-9 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            <a
              href={resolvedPrimary.href}
              className={marketingCta("ink", "lg", "w-full sm:w-auto")}
            >
              {resolvedPrimary.label}
              <ArrowRight aria-hidden className="size-4" />
            </a>
            {secondaryCta ? (
              <a
                href={secondaryCta.href}
                className={marketingCta("outline", "lg", "w-full sm:w-auto")}
              >
                <PlayCircle aria-hidden className="size-4" />
                {secondaryCta.label}
              </a>
            ) : (
              <a href={DEMO_APP_URL} className={marketingCta("outline", "lg", "w-full sm:w-auto")}>
                {t("marketing.header.openDemo")}
                <ArrowUpRight aria-hidden className="text-tide-700 size-4" />
              </a>
            )}
          </div>

          {resolvedFootnote ? <p className="text-faint mt-4 text-sm">{resolvedFootnote}</p> : null}
        </div>

        {screen ? (
          <div className="pd-rise relative lg:-mr-40" style={{ animationDelay: "140ms" }}>
            <BrowserFrame
              screen={LANDING_IMAGES.screens[screen]}
              alt={`${APP_NAME} — ${eyebrow}`}
              sizes="(min-width: 1024px) 800px, 170vw"
              crop="aspect-[16/10]"
              detail="phone"
              priority
            />
          </div>
        ) : (
          <div className="pd-rise relative hidden lg:block" style={{ animationDelay: "140ms" }}>
            <div className="border-line rounded-3xl border bg-white/80 p-8 shadow-[0_40px_80px_-50px_rgba(10,27,61,0.5)] backdrop-blur">
              <div className="flex items-center justify-between">
                <span className="text-faint font-mono text-[11px] font-medium tracking-[0.16em] uppercase">
                  {APP_NAME}
                </span>
                <span aria-hidden className="flex items-center gap-1.5">
                  <span className="bg-tide size-2 rounded-full" />
                  <span className="size-2 rounded-full bg-amber-400" />
                  <span className="bg-ink size-2 rounded-full" />
                </span>
              </div>
              <UnitMatrix className="mt-7" />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
