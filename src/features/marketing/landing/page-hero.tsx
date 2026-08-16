import type { LucideIcon } from "lucide-react";
import { ArrowRight, PlayCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  /** Secondary CTA - defaults to jumping to the product video on `/`. */
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
  const resolvedSecondary = secondaryCta ?? {
    label: t("marketing.common.watchVideo"),
    href: "/#video",
  };
  const resolvedFootnote = footnote ?? t("marketing.common.noObligation");

  return (
    <section
      className="relative overflow-hidden border-b border-[var(--color-border)]"
      aria-labelledby="page-hero-title"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-[var(--color-brand-50)]/70 via-white to-white"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 left-1/2 -z-10 h-72 w-[36rem] -translate-x-1/2 rounded-full bg-[var(--color-brand-200)]/40 blur-3xl"
      />

      <div className="container-app py-12 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <Badge tone="brand" className="gap-1.5">
            {Icon ? <Icon aria-hidden className="size-3.5" /> : null}
            {eyebrow}
          </Badge>
          <h1
            id="page-hero-title"
            className="mt-4 text-balance text-3xl font-extrabold leading-[1.1] tracking-tight text-[var(--color-foreground)] sm:text-5xl lg:text-6xl"
          >
            {title}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-pretty text-base leading-relaxed text-[var(--color-foreground-muted)] sm:mt-5 sm:text-lg">
            {subtitle}
          </p>

          <div className="mt-7 flex flex-col items-stretch justify-center gap-3 sm:mt-8 sm:flex-row sm:items-center">
            <Button asChild size="lg" className="w-full sm:w-auto">
              <a href={resolvedPrimary.href}>
                {resolvedPrimary.label}
                <ArrowRight aria-hidden className="size-4" />
              </a>
            </Button>
            <Button asChild size="lg" variant="outline" className="w-full gap-2 sm:w-auto">
              <a href={resolvedSecondary.href}>
                <PlayCircle aria-hidden className="size-4" />
                {resolvedSecondary.label}
              </a>
            </Button>
          </div>

          {resolvedFootnote ? (
            <p className="mt-4 text-xs text-[var(--color-foreground-subtle)]">
              {resolvedFootnote}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
