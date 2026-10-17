import type { LucideIcon } from "lucide-react";
import { ArrowRight, PlayCircle } from "lucide-react";

import { marketingCta } from "@/features/marketing/marketing-cta";
import { createT } from "@/lib/i18n";
import { resolveRequestLocale } from "@/lib/i18n/resolve-locale";

interface PageHeroProps {
  eyebrow: string;
  title: string;
  subtitle: string;
  /** Icon rendered inside the eyebrow badge. */
  icon?: LucideIcon;
  /** Primary CTA - defaults to demo booking on the /demo page. */
  primaryCta?: { label: string; href: string };
  /** Optional secondary CTA. Omitted when there is no promo video. */
  secondaryCta?: { label: string; href: string };
  /** Optional footnote rendered below the CTAs. */
  footnote?: string;
}

/**
 * Reusable hero for the topic landing pages (`/za-investitore`,
 * `/za-agencije`, ...). Focused, single-CTA layout: no marketing
 * mockups, just one clear H1, one supporting paragraph, and the
 * booking CTA.
 */
export async function PageHero({
  eyebrow,
  title,
  subtitle,
  icon: Icon,
  primaryCta,
  secondaryCta,
  footnote,
}: PageHeroProps) {
  const t = createT(await resolveRequestLocale());
  const resolvedPrimary = primaryCta ?? {
    label: t("marketing.common.bookDemo"),
    href: "/demo#zakazivanje",
  };
  const resolvedSecondary = secondaryCta;
  const resolvedFootnote = footnote ?? t("marketing.common.noObligation");

  return (
    <section
      className="relative overflow-hidden bg-[#0b1020] text-white"
      aria-labelledby="page-hero-title"
    >
      <div
        aria-hidden
        className="pd-glow pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(214,178,106,0.22),transparent_52%),radial-gradient(ellipse_at_bottom,rgba(214,178,106,0.1),transparent_46%)]"
      />

      <div className="container-app relative py-16 sm:py-20 lg:py-24">
        <div className="pd-rise mx-auto max-w-3xl text-center">
          <p className="inline-flex items-center gap-2 rounded-full border border-[#d6b26a]/40 bg-[#d6b26a]/10 px-3 py-1 text-xs font-semibold tracking-wide text-[#f3e2bc]">
            {Icon ? <Icon aria-hidden className="size-3.5" /> : null}
            {eyebrow}
          </p>
          <h1
            id="page-hero-title"
            className="font-display mt-5 text-4xl leading-[1.05] font-semibold tracking-[-0.03em] text-balance text-[#f7f3ea] sm:text-6xl"
          >
            {title}
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-pretty text-white/70 sm:text-lg">
            {subtitle}
          </p>

          <div className="mt-7 flex flex-col items-stretch justify-center gap-3 sm:mt-8 sm:flex-row sm:items-center">
            <a
              href={resolvedPrimary.href}
              className={marketingCta("cream", "lg", "w-full sm:w-auto")}
            >
              {resolvedPrimary.label}
              <ArrowRight aria-hidden className="size-4" />
            </a>
            {resolvedSecondary ? (
              <a
                href={resolvedSecondary.href}
                className={marketingCta("outlineDark", "lg", "w-full sm:w-auto")}
              >
                <PlayCircle aria-hidden className="size-4" />
                {resolvedSecondary.label}
              </a>
            ) : null}
          </div>

          {resolvedFootnote ? (
            <p className="mt-4 text-xs text-white/45">{resolvedFootnote}</p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
