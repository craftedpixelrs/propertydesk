"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";

import { useT } from "@/components/app/i18n-provider";
import { cn } from "@/lib/utils";
import { faqItems } from "@/features/marketing/faq-items";
import { marketingCta } from "@/features/marketing/marketing-cta";
import { SectionHeading } from "@/features/marketing/ui";

/**
 * FAQ accordion with smooth open/close animation.
 *
 * We drive height animation with the `grid-template-rows: 0fr → 1fr`
 * trick: the outer wrapper is a CSS grid whose single row transitions
 * from 0fr to 1fr, and the inner child (with `min-h-0`) provides the
 * intrinsic content height. This animates cleanly for arbitrary
 * content sizes without measuring the DOM, and gracefully degrades
 * to an instant open where CSS grid transitions aren't supported.
 *
 * Multiple items can be open simultaneously - matches the previous
 * `<details>`-based behaviour and lets visitors scan several answers
 * side-by-side.
 */
export function Faq() {
  const t = useT();
  const items = faqItems(t);
  const [openIndexes, setOpenIndexes] = useState<Set<number>>(() => new Set());

  const toggle = (idx: number) => {
    setOpenIndexes((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });
  };

  return (
    <section id="faq" aria-labelledby="faq-title" className="border-line scroll-mt-20 border-t">
      <div className="container-app grid gap-10 py-20 sm:py-28 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:gap-16">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <SectionHeading
            id="faq-title"
            eyebrow={t("marketing.faq.eyebrow")}
            title={t("marketing.faq.title")}
          />
          <p className="text-mute mt-5 text-sm leading-relaxed">{t("marketing.nav.faqBody")}</p>
          <Link href="/demo" className={marketingCta("ink", "md", "mt-6")}>
            {t("marketing.common.bookDemoShort")}
            <ArrowRight aria-hidden className="size-4" />
          </Link>
        </div>

        <div className="border-line border-t">
          {items.map((f, idx) => {
            const isOpen = openIndexes.has(idx);
            const panelId = `faq-panel-${idx}`;
            const triggerId = `faq-trigger-${idx}`;
            return (
              <div key={f.question} className="border-line border-b">
                <h3 className="m-0">
                  <button
                    type="button"
                    id={triggerId}
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => toggle(idx)}
                    className="group text-ink flex w-full cursor-pointer items-start gap-4 py-5 text-left text-[1.05rem] leading-snug font-semibold tracking-[-0.015em] sm:gap-5"
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "mt-0.5 w-6 flex-none font-mono text-[11px] font-medium tracking-[0.14em] tabular-nums transition-colors",
                        isOpen ? "text-tide-700" : "text-faint",
                      )}
                    >
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                    <span className="group-hover:text-tide-700 flex-1 transition-colors">
                      {f.question}
                    </span>
                    <span
                      aria-hidden
                      className={cn(
                        "grid size-7 flex-none place-items-center rounded-lg border transition duration-300 ease-out",
                        isOpen
                          ? "border-ink bg-ink text-tide-300 rotate-45"
                          : "border-line text-mute group-hover:border-ink/40 bg-white",
                      )}
                    >
                      <Plus className="size-4" />
                    </span>
                  </button>
                </h3>
                <div
                  id={panelId}
                  role="region"
                  aria-labelledby={triggerId}
                  className={cn(
                    "grid overflow-hidden transition-[grid-template-rows,opacity] duration-300 ease-out",
                    isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
                  )}
                >
                  <div className="min-h-0">
                    <div className="text-mute max-w-2xl pr-11 pb-6 pl-10 text-[0.95rem] leading-relaxed sm:pl-11">
                      {f.answer}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
