"use client";

import {
  CalendarClock,
  Percent,
  FileSpreadsheet,
  Wrench,
  Users,
  LifeBuoy,
  Lock,
  type LucideIcon,
} from "lucide-react";

import { useT } from "@/components/app/i18n-provider";
import { Eyebrow, Index } from "@/features/marketing/ui";
import type { TranslationKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface Bonus {
  icon: LucideIcon;
  titleKey: TranslationKey;
  bodyKey: TranslationKey;
  highlight?: boolean;
}

const BONUSES: Bonus[] = [
  {
    icon: Percent,
    titleKey: "marketing.bonuses.trialTitle",
    bodyKey: "marketing.bonuses.trialBody",
    highlight: true,
  },
  {
    icon: CalendarClock,
    titleKey: "marketing.bonuses.discountTitle",
    bodyKey: "marketing.bonuses.discountBody",
    highlight: true,
  },
  {
    icon: FileSpreadsheet,
    titleKey: "marketing.bonuses.excelTitle",
    bodyKey: "marketing.bonuses.excelBody",
  },
  {
    icon: Wrench,
    titleKey: "marketing.bonuses.setupTitle",
    bodyKey: "marketing.bonuses.setupBody",
  },
  {
    icon: Users,
    titleKey: "marketing.bonuses.onboardingTitle",
    bodyKey: "marketing.bonuses.onboardingBody",
  },
  {
    icon: LifeBuoy,
    titleKey: "marketing.bonuses.supportTitle",
    bodyKey: "marketing.bonuses.supportBody",
  },
  { icon: Lock, titleKey: "marketing.bonuses.lockTitle", bodyKey: "marketing.bonuses.lockBody" },
];

/** What a new client gets at the start: a ruled list beside the headline. */
export function EarlyBirdBonuses() {
  const t = useT();

  return (
    <section id="rana-ponuda" aria-labelledby="bonuses-title" className="scroll-mt-20 bg-white">
      <div className="container-app grid gap-12 py-20 sm:py-28 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <Eyebrow>
            <span className="flex flex-wrap items-center gap-2.5">
              <span className="bg-ink text-tide-300 rounded-md px-2 py-1 text-[10px]">
                {t("marketing.common.earlyAccess")}
              </span>
              {t("marketing.bonuses.until")}
            </span>
          </Eyebrow>
          <h2
            id="bonuses-title"
            className="text-ink mt-4 text-[2rem] leading-[1.08] font-bold tracking-[-0.035em] text-balance sm:text-[2.6rem] lg:text-[3rem]"
          >
            {t("marketing.bonuses.title")}
          </h2>
          <p className="text-mute mt-5 text-base leading-relaxed sm:text-[1.05rem]">
            <strong className="text-ink font-semibold">{t("marketing.bonuses.leadStrong")}</strong>{" "}
            {t("marketing.bonuses.leadRest")}
          </p>
          <p className="border-line text-faint mt-8 border-t pt-5 text-xs leading-relaxed">
            {t("marketing.bonuses.footnote")}
          </p>
        </div>

        <ul className="border-line border-t">
          {BONUSES.map((b, index) => {
            const Icon = b.icon;
            return (
              <li
                key={b.titleKey}
                data-reveal=""
                style={{ "--pd-delay": `${index * 60}ms` } as React.CSSProperties}
                className="border-line group flex items-start gap-4 border-b py-5 sm:gap-5 sm:py-6"
              >
                <span
                  aria-hidden
                  className={cn(
                    "grid size-11 flex-none place-items-center rounded-xl",
                    b.highlight
                      ? "bg-ink text-tide-300"
                      : "border-line text-tide-700 border bg-white",
                  )}
                >
                  <Icon className="size-5" strokeWidth={1.75} />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-ink text-[1.05rem] leading-snug font-bold tracking-[-0.02em] sm:text-lg">
                    {t(b.titleKey)}
                  </h3>
                  <p className="text-mute mt-1.5 text-sm leading-relaxed">{t(b.bodyKey)}</p>
                </div>
                <Index n={index + 1} className="text-faint mt-1 hidden sm:block" />
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
