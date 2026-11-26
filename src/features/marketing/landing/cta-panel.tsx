import { ArrowRight, PhoneCall } from "lucide-react";

import { marketingCta } from "@/features/marketing/marketing-cta";
import { Eyebrow, UnitMatrix } from "@/features/marketing/ui";
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
 * button's built-in `text-white` primary variant.
 */
export async function CtaPanel({
  title,
  subtitle,
  primaryHref = "/demo#zakazivanje",
  primaryLabel,
}: CtaPanelProps) {
  const t = createT(await resolveRequestLocale());

  return (
    <section aria-labelledby="cta-panel-title" className="border-line border-t">
      <div className="container-app py-14 sm:py-20">
        <div className="bg-ink relative overflow-hidden rounded-[2rem] px-6 py-12 text-white sm:px-12 sm:py-16 lg:grid lg:grid-cols-[minmax(0,7fr)_minmax(0,4fr)] lg:items-center lg:gap-16">
          <div aria-hidden className="pd-grid pd-grid-dark pointer-events-none absolute inset-0" />
          <div
            aria-hidden
            className="pointer-events-none absolute -top-40 -left-20 size-[28rem] rounded-full bg-[radial-gradient(closest-side,rgba(95,210,216,0.22),transparent)]"
          />
          <div className="relative">
            <Eyebrow tone="dark">{t("marketing.booking.eyebrow")}</Eyebrow>
            <h2
              id="cta-panel-title"
              className="mt-4 text-[2rem] leading-[1.08] font-bold tracking-[-0.035em] text-balance text-white sm:text-[2.6rem] lg:text-[3rem]"
            >
              {title ?? t("marketing.cta.title")}
            </h2>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-white/70 sm:text-[1.05rem]">
              {subtitle ?? t("marketing.cta.subtitle")}
            </p>
            <div className="mt-9 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
              <a href={primaryHref} className={marketingCta("accent", "lg")}>
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
          <UnitMatrix tone="dark" className="relative hidden lg:grid" />
        </div>
      </div>
    </section>
  );
}
