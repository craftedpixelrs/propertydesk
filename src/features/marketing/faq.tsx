"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { FAQ_ITEMS } from "@/features/marketing/content";
import { cn } from "@/lib/utils";

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
 * The full answer text is always mounted in the DOM (just clipped via
 * overflow), so the FAQPage JSON-LD schema in [page.tsx](../../app/(marketing)/page.tsx)
 * remains a faithful representation of what's visually available.
 *
 * Multiple items can be open simultaneously - matches the previous
 * `<details>`-based behaviour and lets visitors scan several answers
 * side-by-side.
 */
export function Faq() {
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
      className="scroll-mt-20 border-t border-[var(--color-border)] bg-[var(--color-surface-muted)]"
    >
      <div className="container-app py-16 sm:py-20">
        <div className="max-w-3xl">
          <div className="text-xs font-semibold uppercase tracking-wider text-[var(--color-brand-700)]">
            Česta pitanja
          </div>
          <h2
            id="faq-title"
            className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl"
          >
            Odgovori pre nego što pitate
          </h2>
        </div>

        <div className="mt-8 divide-y divide-[var(--color-border)] overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
          {FAQ_ITEMS.map((f, idx) => {
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
                    className="flex w-full cursor-pointer items-center justify-between gap-4 py-4 text-left text-base font-medium text-[var(--color-foreground)] transition-colors hover:text-[var(--color-brand-700)]"
                  >
                    <span>{f.question}</span>
                    <span
                      aria-hidden
                      className={cn(
                        "grid h-8 w-8 flex-none place-items-center rounded-md border transition duration-300 ease-out",
                        isOpen
                          ? "rotate-45 border-[var(--color-brand-600)] bg-[var(--color-brand-50)] text-[var(--color-brand-700)]"
                          : "border-[var(--color-border)] text-[var(--color-foreground-muted)]",
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
                    isOpen
                      ? "grid-rows-[1fr] opacity-100"
                      : "grid-rows-[0fr] opacity-0",
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
