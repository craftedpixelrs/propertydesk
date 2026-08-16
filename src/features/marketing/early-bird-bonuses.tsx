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

import { Badge } from "@/components/ui/badge";
import { useT } from "@/components/app/i18n-provider";
import type { TranslationKey } from "@/lib/i18n";

interface Bonus {
  icon: LucideIcon;
  titleKey: TranslationKey;
  bodyKey: TranslationKey;
  highlight?: boolean;
}

const BONUSES: Bonus[] = [
  { icon: CalendarClock, titleKey: "marketing.bonuses.trialTitle", bodyKey: "marketing.bonuses.trialBody", highlight: true },
  { icon: Percent, titleKey: "marketing.bonuses.discountTitle", bodyKey: "marketing.bonuses.discountBody", highlight: true },
  { icon: FileSpreadsheet, titleKey: "marketing.bonuses.excelTitle", bodyKey: "marketing.bonuses.excelBody" },
  { icon: Wrench, titleKey: "marketing.bonuses.setupTitle", bodyKey: "marketing.bonuses.setupBody" },
  { icon: Users, titleKey: "marketing.bonuses.onboardingTitle", bodyKey: "marketing.bonuses.onboardingBody" },
  { icon: LifeBuoy, titleKey: "marketing.bonuses.supportTitle", bodyKey: "marketing.bonuses.supportBody" },
  { icon: Lock, titleKey: "marketing.bonuses.lockTitle", bodyKey: "marketing.bonuses.lockBody" },
];

export function EarlyBirdBonuses() {
  const t = useT();

  return (
    <section
      id="rana-ponuda"
      aria-labelledby="bonuses-title"
      className="scroll-mt-20 border-t border-[var(--color-border)]"
    >
      <div className="container-app py-16 sm:py-20">
        <div className="max-w-3xl">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-brand-700)]">
            <Badge tone="success" className="uppercase tracking-wide">
              {t("marketing.common.earlyAccess")}
            </Badge>
            <span>{t("marketing.bonuses.until")}</span>
          </div>
          <h2
            id="bonuses-title"
            className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl"
          >
            {t("marketing.bonuses.title")}
          </h2>
          <p className="mt-4 text-base leading-relaxed text-[var(--color-foreground-muted)]">
            <strong className="font-semibold text-[var(--color-foreground)]">
              {t("marketing.bonuses.leadStrong")}
            </strong>{" "}
            {t("marketing.bonuses.leadRest")}
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {BONUSES.map((b) => {
            const Icon = b.icon;
            return (
              <article
                key={b.titleKey}
                className={
                  b.highlight
                    ? "rounded-xl border-2 border-[var(--color-brand-600)] bg-[var(--color-brand-50)] p-5 shadow-sm"
                    : "rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-sm"
                }
              >
                <div className="flex items-start gap-3">
                  <span
                    aria-hidden
                    className={
                      b.highlight
                        ? "grid h-10 w-10 flex-none place-items-center rounded-lg bg-[var(--color-brand-600)] text-white"
                        : "grid h-10 w-10 flex-none place-items-center rounded-lg bg-[var(--color-brand-50)] text-[var(--color-brand-700)]"
                    }
                  >
                    <Icon className="size-5" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-base font-semibold text-[var(--color-foreground)]">
                      {t(b.titleKey)}
                    </h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-[var(--color-foreground-muted)]">
                      {t(b.bodyKey)}
                    </p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        <p className="mt-6 text-xs text-[var(--color-foreground-subtle)]">
          {t("marketing.bonuses.footnote")}
        </p>
      </div>
    </section>
  );
}
