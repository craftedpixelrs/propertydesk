"use client";

import { CalendarCheck, Presentation, PlayCircle, GraduationCap } from "lucide-react";

import { useT } from "@/components/app/i18n-provider";
import { SectionHeading } from "@/features/marketing/ui";
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

/** From the first call to a trained team, as four stops on one line. */
export function DemoTraining() {
  const t = useT();

  return (
    <section aria-labelledby="demo-title" className="bg-white">
      <div className="container-app py-20 sm:py-28">
        <SectionHeading
          id="demo-title"
          eyebrow={t("marketing.demo.eyebrow")}
          title={t("marketing.demo.title")}
          subtitle={t("marketing.demo.subtitle")}
        />

        <ol className="relative mt-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
          <span
            aria-hidden
            className="from-tide via-line to-line absolute top-5 right-0 left-0 hidden h-px bg-gradient-to-r lg:block"
          />
          {STEPS.map((s, index) => {
            const Icon = s.icon;
            return (
              <li
                key={s.number}
                data-reveal=""
                style={{ "--pd-delay": `${index * 90}ms` } as React.CSSProperties}
                className="relative"
              >
                <div className="flex items-center gap-3">
                  <span
                    aria-hidden
                    className={
                      index === 0
                        ? "bg-ink text-tide-300 relative grid size-10 place-items-center rounded-[10px] ring-8 ring-white"
                        : "border-line text-tide-700 relative grid size-10 place-items-center rounded-[10px] border bg-white ring-8 ring-white"
                    }
                  >
                    <Icon className="size-[1.1rem]" strokeWidth={1.75} />
                  </span>
                  <span
                    aria-hidden
                    className="text-faint bg-white pr-3 font-mono text-[11px] font-medium tracking-[0.14em]"
                  >
                    {s.number}
                  </span>
                </div>
                <h3 className="text-ink mt-6 text-lg leading-snug font-bold tracking-[-0.025em]">
                  {t(s.titleKey)}
                </h3>
                <p className="text-mute mt-2.5 text-sm leading-relaxed">{t(s.bodyKey)}</p>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
