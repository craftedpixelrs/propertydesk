import { Check, ArrowRight, MinusCircle } from "lucide-react";

import { createT } from "@/lib/i18n";
import { resolveRequestLocale } from "@/lib/i18n/resolve-locale";

interface Pair {
  problem: string;
  solution: string;
}

interface ProblemSolutionGridProps {
  title?: string;
  subtitle?: string;
  items: Pair[];
}

/**
 * Two-column "Problem → PropertyDesk" grid used on the topic landing
 * pages (investors, agencies, city pages, hub, ...).
 *
 * Design brief (October 2026 iteration):
 *  - Removed the loud `bg-red-50 / text-red-600` "PROBLEM" badge that
 *    clashed with the beige/navy brand palette. The pain-point side
 *    now reads as a desaturated "before" state (muted ink), so the
 *    reader's eye lands on the branded solution side on the right.
 *  - Added a subtle gold left-rail on the solution column plus a small
 *    arrow glyph between the two columns on wide screens to carry the
 *    before → after narrative visually.
 *  - Cards use the beige surface token so they match the hero / CTA
 *    panels instead of plain white, giving the section a cohesive feel
 *    with the rest of the landing page.
 */
export async function ProblemSolutionGrid({ title, subtitle, items }: ProblemSolutionGridProps) {
  const t = createT(await resolveRequestLocale());

  return (
    <section aria-labelledby="ps-title" className="bg-white">
      <div className="container-app py-16 sm:py-20">
        <div className="max-w-3xl">
          <h2
            id="ps-title"
            className="font-display text-4xl font-semibold tracking-tight text-[#0b1020] sm:text-5xl"
          >
            {title ?? t("marketing.cta.title")}
          </h2>
          {subtitle ? (
            <p className="mt-4 text-base leading-relaxed text-[var(--color-foreground-muted)]">
              {subtitle}
            </p>
          ) : null}
        </div>

        <div className="mt-10 space-y-4">
          {items.map((it, i) => (
            <article
              key={i}
              data-reveal=""
              style={{ "--pd-delay": `${i * 70}ms` } as React.CSSProperties}
              className="relative grid gap-5 overflow-hidden rounded-2xl border border-[#0b1020]/10 bg-[#f7f3ea] p-5 shadow-sm sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-stretch sm:gap-6 sm:p-6"
            >
              {/* Problem (before) — muted "ink" tone, no red. */}
              <div className="flex items-start gap-3">
                <span
                  aria-hidden
                  className="grid h-9 w-9 flex-none place-items-center rounded-lg bg-[#0b1020]/10 text-[#0b1020]/55 ring-1 ring-[#0b1020]/5 ring-inset"
                >
                  <MinusCircle className="size-4" strokeWidth={2} />
                </span>
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold tracking-[0.16em] text-[#0b1020]/55 uppercase">
                    {t("marketing.common.problem")}
                  </div>
                  <p className="mt-1.5 text-sm leading-relaxed text-[#0b1020]/80">{it.problem}</p>
                </div>
              </div>

              {/* Arrow divider — only visible on sm+ screens. */}
              <div aria-hidden className="hidden items-center justify-center sm:flex">
                <span className="grid size-8 place-items-center rounded-full border border-[#d6b26a]/40 bg-white text-[#9a7430] shadow-sm">
                  <ArrowRight className="size-4" strokeWidth={2.25} />
                </span>
              </div>

              {/* Solution — branded navy + gold accent, slight gold left rail. */}
              <div className="relative flex items-start gap-3 rounded-xl bg-white p-3 shadow-[0_1px_0_rgba(11,16,32,0.04)] sm:p-4">
                <span
                  aria-hidden
                  className="absolute top-3 bottom-3 left-0 w-0.5 rounded-r bg-[#d6b26a]"
                />
                <span
                  aria-hidden
                  className="ml-1 grid size-9 flex-none place-items-center rounded-lg bg-[#0b1020] text-[#f3e2bc]"
                >
                  <Check className="size-4" strokeWidth={2.5} />
                </span>
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold tracking-[0.16em] text-[#9a7430] uppercase">
                    PropertyDesk
                  </div>
                  <p className="mt-1.5 text-sm leading-relaxed text-[#0b1020]">{it.solution}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
