"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { CircleHelp } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useT } from "@/components/app/i18n-provider";
import type { TranslationKey } from "@/lib/i18n";
import {
  PAGE_GUIDE_STORAGE_KEY,
  resolvePageGuide,
  type PageGuideKey,
} from "@/lib/guides/catalog";

function storage(): Record<string, "seen" | "skip"> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(PAGE_GUIDE_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, "seen" | "skip">) : {};
  } catch {
    return {};
  }
}

function writeStorage(next: Record<string, "seen" | "skip">) {
  window.localStorage.setItem(PAGE_GUIDE_STORAGE_KEY, JSON.stringify(next));
}

function guideTitleKey(key: PageGuideKey): TranslationKey {
  return `guides.${key}.title` as TranslationKey;
}

function stepTitleKey(key: PageGuideKey, n: number): TranslationKey {
  return `guides.${key}.s${n}Title` as TranslationKey;
}

function stepBodyKey(key: PageGuideKey, n: number): TranslationKey {
  return `guides.${key}.s${n}Body` as TranslationKey;
}

export function PageGuide({ disabled = false }: { disabled?: boolean }) {
  const pathname = usePathname();
  const t = useT();
  const guide = useMemo(() => resolvePageGuide(pathname), [pathname]);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [dontAuto, setDontAuto] = useState(false);
  const dismissed = useRef<"seen" | "skip" | null>(null);

  const mark = useCallback(
    (value: "seen" | "skip") => {
      if (!guide) return;
      const next = { ...storage(), [guide.key]: value };
      writeStorage(next);
    },
    [guide],
  );

  useEffect(() => {
    setStep(0);
    setOpen(false);
    setDontAuto(false);
    dismissed.current = null;
    if (!guide || disabled) return;
    const state = storage()[guide.key];
    if (state === "skip" || state === "seen") return;
    const timer = window.setTimeout(() => setOpen(true), 500);
    return () => window.clearTimeout(timer);
  }, [guide, disabled]);

  if (disabled || !guide) return null;

  const total = guide.steps;
  const current = step + 1;
  const isLast = step >= total - 1;

  function close(nextState: "seen" | "skip") {
    if (dismissed.current) {
      setOpen(false);
      return;
    }
    dismissed.current = nextState;
    mark(dontAuto ? "skip" : nextState);
    setOpen(false);
    setStep(0);
  }

  return (
    <>
      <button
        type="button"
        className="fixed z-40 flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm font-medium text-[var(--color-foreground)] shadow-md hover:bg-[var(--color-surface-inset)] bottom-[5.5rem] right-4 md:bottom-6"
        onClick={() => {
          dismissed.current = null;
          setStep(0);
          setOpen(true);
        }}
        aria-label={t("guides.chrome.open")}
      >
        <CircleHelp className="size-4 shrink-0" aria-hidden />
        <span>{t("guides.chrome.open")}</span>
      </button>

      <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : close("seen"))}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t(guideTitleKey(guide.key))}</DialogTitle>
            <DialogDescription>
              {t("guides.chrome.stepOf", { current, total })}
            </DialogDescription>
          </DialogHeader>

          <div className="flex gap-1">
            {Array.from({ length: total }, (_, i) => (
              <button
                key={i}
                type="button"
                aria-label={t("guides.chrome.stepOf", { current: i + 1, total })}
                aria-current={i === step ? "step" : undefined}
                className={
                  i === step
                    ? "h-1.5 flex-1 rounded-full bg-[var(--color-brand-600)]"
                    : "h-1.5 flex-1 rounded-full bg-[var(--color-border)] hover:bg-[var(--color-foreground-muted)]"
                }
                onClick={() => setStep(i)}
              />
            ))}
          </div>

          <div className="space-y-2">
            <h3 className="text-base font-semibold">
              {t(stepTitleKey(guide.key, current))}
            </h3>
            <p className="text-sm leading-relaxed text-[var(--color-foreground-muted)]">
              {t(stepBodyKey(guide.key, current))}
            </p>
          </div>

          <label className="flex items-center gap-2 text-xs text-[var(--color-foreground-muted)]">
            <input
              type="checkbox"
              checked={dontAuto}
              onChange={(e) => setDontAuto(e.target.checked)}
            />
            {t("guides.chrome.dontShowAgain")}
          </label>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => close("skip")}>
              {t("guides.chrome.skip")}
            </Button>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={step === 0}
                onClick={() => setStep((s) => Math.max(0, s - 1))}
              >
                {t("guides.chrome.previous")}
              </Button>
              {isLast ? (
                <Button type="button" size="sm" onClick={() => close("seen")}>
                  {t("guides.chrome.finish")}
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setStep((s) => Math.min(total - 1, s + 1))}
                >
                  {t("guides.chrome.next")}
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
