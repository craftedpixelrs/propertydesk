"use client";

import { useEffect, useState } from "react";

import { useT } from "@/components/app/i18n-provider";
import { cn } from "@/lib/utils";

/**
 * Countdown to the SaaS public launch.
 *
 * The target is a fixed ISO date (see `LAUNCH_DATE_ISO`). Both server and
 * client render the SAME placeholder ("-") on first paint to avoid a
 * hydration mismatch; the real values swap in after the effect runs.
 */
export interface CountdownProps {
  targetIso: string;
  className?: string;
  /** `onDark` is for the ink hero, where the cells sit on a night background. */
  tone?: "default" | "onDark";
}

interface Parts {
  days: string;
  hours: string;
  minutes: string;
  seconds: string;
}

const PLACEHOLDER: Parts = { days: "-", hours: "-", minutes: "-", seconds: "-" };

function computeParts(targetIso: string): Parts {
  const now = Date.now();
  const target = new Date(targetIso).getTime();
  const diff = Math.max(0, target - now);

  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff % 86_400_000) / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);
  const seconds = Math.floor((diff % 60_000) / 1000);

  const pad = (n: number) => n.toString().padStart(2, "0");
  return {
    days: pad(days),
    hours: pad(hours),
    minutes: pad(minutes),
    seconds: pad(seconds),
  };
}

export function Countdown({ targetIso, className, tone = "default" }: CountdownProps) {
  const t = useT();
  const [parts, setParts] = useState<Parts>(PLACEHOLDER);

  useEffect(() => {
    setParts(computeParts(targetIso));
    const handle = window.setInterval(() => {
      setParts(computeParts(targetIso));
    }, 1000);
    return () => window.clearInterval(handle);
  }, [targetIso]);

  const cells: Array<{ value: string; label: string }> = [
    { value: parts.days, label: t("marketing.countdown.days") },
    { value: parts.hours, label: t("marketing.countdown.hours") },
    { value: parts.minutes, label: t("marketing.countdown.minutes") },
    { value: parts.seconds, label: t("marketing.countdown.seconds") },
  ];

  return (
    <div
      className={cn("grid grid-cols-4 gap-2 text-center sm:gap-3", className)}
      aria-label={t("marketing.countdown.aria")}
    >
      {cells.map((c) => (
        <div
          key={c.label}
          className={cn(
            "rounded-xl px-2 py-3 sm:px-4 sm:py-4",
            tone === "onDark"
              ? "border border-white/10 bg-white/[0.06] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
              : "border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm",
          )}
        >
          <div
            className={cn(
              "font-display text-2xl font-semibold tabular-nums sm:text-3xl",
              tone === "onDark" ? "text-[#f6f1e7]" : "text-[var(--color-foreground)]",
            )}
          >
            {c.value}
          </div>
          <div
            className={cn(
              "mt-0.5 text-[10px] font-medium tracking-wider uppercase sm:text-xs",
              tone === "onDark" ? "text-white/55" : "text-[var(--color-foreground-muted)]",
            )}
          >
            {c.label}
          </div>
        </div>
      ))}
    </div>
  );
}
