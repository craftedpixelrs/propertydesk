"use client";

import { CalendarCheck, Presentation, PlayCircle, GraduationCap } from "lucide-react";

import { useT } from "@/components/app/i18n-provider";
import type { TranslationKey } from "@/lib/i18n";

const STEPS: Array<{
  icon: typeof CalendarCheck;
  number: string;
  titleKey: TranslationKey;
  bodyKey: TranslationKey;
}> = [
  { icon: CalendarCheck, number: "01", titleKey: "marketing.demo.step1Title", bodyKey: "marketing.demo.step1Body" },
  { icon: Presentation, number: "02", titleKey: "marketing.demo.step2Title", bodyKey: "marketing.demo.step2Body" },
  { icon: PlayCircle, number: "03", titleKey: "marketing.demo.step3Title", bodyKey: "marketing.demo.step3Body" },
  { icon: GraduationCap, number: "04", titleKey: "marketing.demo.step4Title", bodyKey: "marketing.demo.step4Body" },
];

export function DemoTraining() {
  const t = useT();

  return (
    <section
      aria-labelledby="demo-title"
      className="bg-[var(--color-surface-muted)]"
    >
      <div className="container-app py-16 sm:py-20">
        <div className="max-w-3xl">
          <div className="text-xs font-semibold uppercase tracking-wider text-[var(--color-brand-700)]">
            {t("marketing.demo.eyebrow")}
          </div>
          <h2
            id="demo-title"
            className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl"
          >
            {t("marketing.demo.title")}
          </h2>
          <p className="mt-4 text-base leading-relaxed text-[var(--color-foreground-muted)]">
            {t("marketing.demo.subtitle")}
          </p>
        </div>

        <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s) => {
            const Icon = s.icon;
            return (
              <li
                key={s.number}
                className="relative rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <span
                    aria-hidden
                    className="grid h-10 w-10 place-items-center rounded-lg bg-[var(--color-brand-50)] text-[var(--color-brand-700)]"
                  >
                    <Icon className="size-5" />
                  </span>
                  <span
                    aria-hidden
                    className="font-mono text-2xl font-bold text-[var(--color-brand-100)]"
                  >
                    {s.number}
                  </span>
                </div>
                <h3 className="mt-4 text-base font-semibold">{t(s.titleKey)}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-[var(--color-foreground-muted)]">
                  {t(s.bodyKey)}
                </p>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
