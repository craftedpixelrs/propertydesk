"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { useT } from "@/components/app/i18n-provider";
import { cn } from "@/lib/utils";
import { faqItems } from "@/features/marketing/faq-items";

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
    <section
      id="faq"
      aria-labelledby="faq-title"
      className="scroll-mt-20 border-t border-[#0b1020]/10 bg-white"
    >
      <div className="container-app py-16 sm:py-20">
        <div className="max-w-3xl">
          <div className="text-xs font-semibold tracking-[0.18em] text-[#9a7430] uppercase">
            {t("marketing.faq.eyebrow")}
          </div>
          <h2
            id="faq-title"
            className="font-display mt-3 text-4xl font-semibold tracking-tight text-[#0b1020] sm:text-5xl"
          >
            {t("marketing.faq.title")}
          </h2>
        </div>

        <div className="mt-10 divide-y divide-[#0b1020]/10 overflow-hidden rounded-3xl border border-[#0b1020]/10 bg-[#f7f3ea]">
          {items.map((f, idx) => {
            const isOpen = openIndexes.has(idx);
            const panelId = `faq-panel-${idx}`;
            const triggerId = `faq-trigger-${idx}`;
            return (
              <div key={f.question} className="px-5 sm:px-6">
                <h3 className="m-0">
                  <button
                    type="button"
                    id={triggerId}
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => toggle(idx)}
                    className="flex w-full cursor-pointer items-center justify-between gap-4 py-4 text-left text-base font-medium text-[#0b1020] transition-colors hover:text-[#9a7430]"
                  >
                    <span>{f.question}</span>
                    <span
                      aria-hidden
                      className={cn(
                        "grid h-8 w-8 flex-none place-items-center rounded-md border transition duration-300 ease-out",
                        isOpen
                          ? "rotate-45 border-[#d6b26a] bg-[#0b1020] text-[#f3e2bc]"
                          : "border-[#0b1020]/15 text-[#0b1020]/55",
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
                    <div className="pb-4 text-sm leading-relaxed text-[var(--color-foreground-muted)]">
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
