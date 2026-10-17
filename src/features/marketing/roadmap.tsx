"use client";

import type { LucideIcon } from "lucide-react";
import { Blocks, Bot, FileSignature, Network, SearchCheck, Zap } from "lucide-react";

import { useT } from "@/components/app/i18n-provider";
import type { TranslationKey } from "@/lib/i18n";

interface RoadmapItem {
  icon: LucideIcon;
  titleKey: TranslationKey;
  bodyKey: TranslationKey;
}

const ROADMAP: RoadmapItem[] = [
  { icon: Blocks, titleKey: "marketing.roadmap.wpTitle", bodyKey: "marketing.roadmap.wpBody" },
  { icon: Bot, titleKey: "marketing.roadmap.aiTitle", bodyKey: "marketing.roadmap.aiBody" },
  {
    icon: SearchCheck,
    titleKey: "marketing.roadmap.qualifyTitle",
    bodyKey: "marketing.roadmap.qualifyBody",
  },
  { icon: Zap, titleKey: "marketing.roadmap.leadsTitle", bodyKey: "marketing.roadmap.leadsBody" },
  {
    icon: FileSignature,
    titleKey: "marketing.roadmap.signTitle",
    bodyKey: "marketing.roadmap.signBody",
  },
  {
    icon: Network,
    titleKey: "marketing.roadmap.marketTitle",
    bodyKey: "marketing.roadmap.marketBody",
  },
];

export function Roadmap() {
  const t = useT();

  return (
    <section id="uskoro" aria-labelledby="roadmap-title" className="scroll-mt-20 bg-[#f7f3ea]">
      <div className="container-app py-16 sm:py-24">
        <div className="max-w-3xl">
          <div className="text-xs font-semibold tracking-[0.18em] text-[#9a7430] uppercase">
            {t("marketing.roadmap.eyebrow")}
          </div>
          <h2
            id="roadmap-title"
            className="font-display mt-3 text-4xl font-semibold tracking-tight text-[#0b1020] sm:text-5xl"
          >
            {t("marketing.roadmap.title")}
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[var(--color-foreground-muted)]">
            {t("marketing.roadmap.subtitle")}
          </p>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ROADMAP.map((item, index) => {
            const Icon = item.icon;
            return (
              <article
                key={item.titleKey}
                data-reveal=""
                style={{ "--pd-delay": `${(index % 3) * 80}ms` } as React.CSSProperties}
                className="flex flex-col gap-3 rounded-2xl border border-[#0b1020]/10 bg-white p-6"
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    aria-hidden
                    className="grid size-10 flex-none place-items-center rounded-xl bg-[#0b1020] text-[#f3e2bc]"
                  >
                    <Icon className="size-4" />
                  </span>
                  <span className="rounded-full border border-[#d6b26a]/50 bg-[#f7f3ea] px-2 py-0.5 text-[10px] font-semibold tracking-[0.12em] text-[#9a7430] uppercase">
                    {t("marketing.roadmap.notADeadline")}
                  </span>
                </div>
                <div>
                  <h3 className="font-display text-lg font-semibold text-[#0b1020]">
                    {t(item.titleKey)}
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-[var(--color-foreground-muted)]">
                    {t(item.bodyKey)}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
