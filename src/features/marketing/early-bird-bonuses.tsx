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
import type { TranslationKey } from "@/lib/i18n";

interface Bonus {
  icon: LucideIcon;
  titleKey: TranslationKey;
  bodyKey: TranslationKey;
  highlight?: boolean;
}

const BONUSES: Bonus[] = [
  {
    icon: CalendarClock,
    titleKey: "marketing.bonuses.trialTitle",
    bodyKey: "marketing.bonuses.trialBody",
    highlight: true,
  },
  {
    icon: Percent,
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
          <div className="flex flex-wrap items-center gap-3 text-xs font-semibold tracking-[0.16em] text-[#9a7430] uppercase">
            <span className="inline-flex items-center rounded-full bg-[#0b1020] px-2.5 py-1 text-[10px] tracking-[0.16em] text-[#f3e2bc]">
              {t("marketing.common.earlyAccess")}
            </span>
            <span>{t("marketing.bonuses.until")}</span>
          </div>
          <h2
            id="bonuses-title"
            className="font-display mt-3 text-4xl font-semibold tracking-tight text-[#0b1020] sm:text-5xl"
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
          {BONUSES.map((b, index) => {
            const Icon = b.icon;
            return (
              <article
                key={b.titleKey}
                data-reveal=""
                style={{ "--pd-delay": `${(index % 3) * 80}ms` } as React.CSSProperties}
                className={
                  b.highlight
                    ? "rounded-2xl bg-[#0b1020] p-6 text-[#f7f3ea]"
                    : "rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6"
                }
              >
                <div className="flex items-start gap-3">
                  <span
                    aria-hidden
                    className={
                      b.highlight
                        ? "grid size-10 flex-none place-items-center rounded-xl bg-[#d6b26a]/20 text-[#f3e2bc]"
                        : "grid size-10 flex-none place-items-center rounded-xl bg-[#f7f3ea] text-[#0b1020]"
                    }
                  >
                    <Icon className="size-5" />
                  </span>
                  <div className="min-w-0">
                    <h3
                      className={
                        b.highlight
                          ? "font-display text-lg font-semibold"
                          : "font-display text-lg font-semibold text-[#0b1020]"
                      }
                    >
                      {t(b.titleKey)}
                    </h3>
                    <p
                      className={
                        b.highlight
                          ? "mt-1.5 text-sm leading-relaxed text-white/65"
                          : "mt-1.5 text-sm leading-relaxed text-[var(--color-foreground-muted)]"
                      }
                    >
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
