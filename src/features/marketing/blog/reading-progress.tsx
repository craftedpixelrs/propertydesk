"use client";

import { useEffect, useState } from "react";

import { useT } from "@/components/app/i18n-provider";

/**
 * Thin bar under the marketing header. It fills with the article,
 * and the label counts the minutes still ahead.
 */
export function ReadingProgress({ minutes, targetId }: { minutes: number; targetId: string }) {
  const t = useT();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const article = document.getElementById(targetId);
    if (!article) return;

    const measure = () => {
      const start = article.offsetTop;
      const end = start + article.offsetHeight - window.innerHeight;
      const span = Math.max(end - start, 1);
      const next = Math.min(1, Math.max(0, (window.scrollY - start) / span));
      setProgress(next);
    };

    measure();
    window.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
    };
  }, [targetId]);

  const done = progress >= 0.98;
  const left = done ? 0 : Math.max(1, Math.ceil((1 - progress) * minutes));
  const percent = Math.round(progress * 100);

  return (
    <div className="fixed inset-x-0 top-[4.25rem] z-30 border-b border-white/10 bg-[#0b1020]/95 backdrop-blur-md">
      <div className="container-app flex h-9 items-center gap-3">
        <div
          className="h-1 min-w-0 flex-1 overflow-hidden rounded-full bg-white/10"
          role="progressbar"
          aria-label={t("marketing.blog.progressAria")}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
        >
          <div
            className="h-full rounded-full bg-[#d6b26a] motion-safe:transition-[width] motion-safe:duration-150 motion-safe:ease-out"
            style={{ width: `${percent}%` }}
          />
        </div>
        <p className="shrink-0 text-xs font-medium tracking-wide text-[#f3e2bc] tabular-nums">
          {done
            ? t("marketing.blog.progressDone")
            : t("marketing.blog.progressLeft", { count: left })}
        </p>
      </div>
    </div>
  );
}
