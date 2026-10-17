import { ArrowRight, CalendarCheck2, PhoneCall } from "lucide-react";

import { marketingCta } from "@/features/marketing/marketing-cta";
import { createT } from "@/lib/i18n";
import { resolveRequestLocale } from "@/lib/i18n/resolve-locale";

interface CtaPanelProps {
  title?: string;
  subtitle?: string;
  primaryHref?: string;
  primaryLabel?: string;
}

/**
 * Solo call-to-action panel rendered at the bottom of every topic
 * landing page. Single goal: book a 25-minute demo.
 *
 * Uses raw `<a>` tags with explicit color classes instead of the
 * shared `<Button>` component because Tailwind v4 `tailwind-merge`
 * cannot reliably deduplicate arbitrary-value overrides against the
 * button's built-in `text-white` primary variant, which was causing
 * the "invisible label on white button" bug on the dark-gradient
 * background.
 */
export async function CtaPanel({
  title,
  subtitle,
  primaryHref = "/demo#zakazivanje",
  primaryLabel,
}: CtaPanelProps) {
  const t = createT(await resolveRequestLocale());

  return (
    <section
      aria-labelledby="cta-panel-title"
      className="relative overflow-hidden bg-[#0b1020] text-[#f7f3ea]"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-0 bg-[radial-gradient(ellipse_at_top,rgba(214,178,106,0.22),transparent_55%)]"
      />
      <div className="container-app relative z-10 py-16 sm:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <span
            aria-hidden
            className="inline-grid size-14 place-items-center rounded-full bg-[#d6b26a]/20 text-[#f3e2bc] ring-1 ring-[#d6b26a]/40"
          >
            <CalendarCheck2 className="size-6" />
          </span>
          <h2
            id="cta-panel-title"
            className="font-display mt-5 text-4xl font-semibold tracking-tight text-[#f7f3ea] sm:text-5xl"
          >
            {title ?? t("marketing.cta.title")}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-white/90">
            {subtitle ?? t("marketing.cta.subtitle")}
          </p>
          <div className="mt-8 flex w-full flex-col items-stretch justify-center gap-3 sm:w-auto sm:flex-row sm:items-center">
            <a href={primaryHref} className={marketingCta("cream", "lg")}>
              {primaryLabel ?? t("marketing.common.bookDemo")}
              <ArrowRight aria-hidden className="size-4" />
            </a>
            <a href="tel:+381654363142" className={marketingCta("outlineDark", "lg")}>
              <PhoneCall aria-hidden className="size-4" />
              <span className="sm:hidden">{t("marketing.common.callUs")}</span>
              <span className="hidden sm:inline">{t("marketing.common.callUsPhone")}</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
