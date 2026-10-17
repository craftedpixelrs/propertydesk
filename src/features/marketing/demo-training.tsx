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
  {
    icon: CalendarCheck,
    number: "01",
    titleKey: "marketing.demo.step1Title",
    bodyKey: "marketing.demo.step1Body",
  },
  {
    icon: Presentation,
    number: "02",
    titleKey: "marketing.demo.step2Title",
    bodyKey: "marketing.demo.step2Body",
  },
  {
    icon: PlayCircle,
    number: "03",
    titleKey: "marketing.demo.step3Title",
    bodyKey: "marketing.demo.step3Body",
  },
  {
    icon: GraduationCap,
    number: "04",
    titleKey: "marketing.demo.step4Title",
    bodyKey: "marketing.demo.step4Body",
  },
];

export function DemoTraining() {
  const t = useT();

  return (
    <section aria-labelledby="demo-title" className="bg-white">
      <div className="container-app py-16 sm:py-24">
        <div className="max-w-3xl">
          <div className="text-xs font-semibold tracking-[0.18em] text-[#9a7430] uppercase">
            {t("marketing.demo.eyebrow")}
          </div>
          <h2
            id="demo-title"
            className="font-display mt-3 text-4xl font-semibold tracking-tight text-[#0b1020] sm:text-5xl"
          >
            {t("marketing.demo.title")}
          </h2>
          <p className="mt-4 text-base leading-relaxed text-[var(--color-foreground-muted)]">
            {t("marketing.demo.subtitle")}
          </p>
        </div>

        <ol className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, index) => {
            const Icon = s.icon;
            return (
              <li
                key={s.number}
                data-reveal=""
                style={{ "--pd-delay": `${index * 80}ms` } as React.CSSProperties}
                className="border-t-2 border-[#d6b26a] pt-5"
              >
                <div className="flex items-center justify-between">
                  <span aria-hidden className="font-display text-4xl leading-none text-[#0b1020]">
                    {s.number}
                  </span>
                  <span
                    aria-hidden
                    className="grid size-10 place-items-center rounded-full bg-[#0b1020] text-[#f3e2bc]"
                  >
                    <Icon className="size-4" />
                  </span>
                </div>
                <h3 className="font-display mt-5 text-xl font-semibold text-[#0b1020]">
                  {t(s.titleKey)}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--color-foreground-muted)]">
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
