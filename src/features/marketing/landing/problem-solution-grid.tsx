import { ArrowRight, Check } from "lucide-react";

import { SectionHeading } from "@/features/marketing/ui";
import { APP_NAME } from "@/lib/constants/app";
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
 * "Problem → PropertyDesk" ledger used on the topic landing pages
 * (investors, agencies, city pages, hub, ...).
 *
 * One ruled table instead of a stack of cards: the left column is the
 * muted "before", the right column is tinted and reads top to bottom
 * as the list of what the product does about it. On phones each row
 * stacks, problem first.
 */
export async function ProblemSolutionGrid({ title, subtitle, items }: ProblemSolutionGridProps) {
  const t = createT(await resolveRequestLocale());

  return (
    <section aria-labelledby="ps-title" className="bg-white">
      <div className="container-app py-20 sm:py-28">
        <SectionHeading
          id="ps-title"
          title={title ?? t("marketing.cta.title")}
          subtitle={subtitle}
        />

        <div className="border-line mt-12 overflow-hidden rounded-3xl border">
          <div
            aria-hidden
            className="border-line bg-paper hidden grid-cols-[4rem_minmax(0,1fr)_minmax(0,1fr)] border-b font-mono text-[11px] font-medium tracking-[0.16em] uppercase md:grid"
          >
            <span />
            <span className="text-faint px-6 py-3.5">{t("marketing.common.problem")}</span>
            <span className="bg-ink text-tide-300 flex items-center gap-2 px-6 py-3.5">
              <ArrowRight className="size-3.5" />
              {APP_NAME}
            </span>
          </div>
          <ol>
            {items.map((it, i) => (
              <li
                key={i}
                data-reveal="fade"
                style={{ "--pd-delay": `${Math.min(i, 6) * 50}ms` } as React.CSSProperties}
                className="border-line grid border-b last:border-b-0 md:grid-cols-[4rem_minmax(0,1fr)_minmax(0,1fr)]"
              >
                <span
                  aria-hidden
                  className="text-faint hidden px-6 py-6 font-mono text-[11px] font-medium tracking-[0.14em] tabular-nums md:block"
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="px-5 pt-5 pb-4 md:px-6 md:py-6">
                  <div className="text-faint mb-2 font-mono text-[10px] font-medium tracking-[0.16em] uppercase md:hidden">
                    {String(i + 1).padStart(2, "0")} · {t("marketing.common.problem")}
                  </div>
                  <p className="text-mute text-[0.95rem] leading-relaxed">{it.problem}</p>
                </div>
                <div className="bg-tide-50/70 border-tide/15 flex items-start gap-3 border-t px-5 py-4 md:border-t-0 md:border-l md:px-6 md:py-6">
                  <span
                    aria-hidden
                    className="bg-tide mt-0.5 grid size-5 flex-none place-items-center rounded-full text-white"
                  >
                    <Check className="size-3" strokeWidth={3.5} />
                  </span>
                  <p className="text-ink text-[0.95rem] leading-relaxed font-medium">
                    {it.solution}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
