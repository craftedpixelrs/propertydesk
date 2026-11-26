"use client";

import type { LucideIcon } from "lucide-react";
import { Blocks, Bot, FileSignature, Network, SearchCheck, Zap } from "lucide-react";

import { useT } from "@/components/app/i18n-provider";
import { SectionHeading } from "@/features/marketing/ui";
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

/**
 * Ideas, not promises. Dashed outlines and hatching keep them visibly
 * apart from what the product does today.
 */
export function Roadmap() {
  const t = useT();

  return (
    <section
      id="uskoro"
      aria-labelledby="roadmap-title"
      className="border-line scroll-mt-20 border-t"
    >
      <div className="container-app py-20 sm:py-28">
        <SectionHeading
          id="roadmap-title"
          eyebrow={t("marketing.roadmap.eyebrow")}
          title={t("marketing.roadmap.title")}
          subtitle={t("marketing.roadmap.subtitle")}
        />

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ROADMAP.map((item, index) => {
            const Icon = item.icon;
            return (
              <article
                key={item.titleKey}
                data-reveal=""
                style={{ "--pd-delay": `${(index % 3) * 80}ms` } as React.CSSProperties}
                className="pd-hatch border-ink/20 flex flex-col gap-5 rounded-2xl border border-dashed p-6"
              >
                <div className="flex items-center justify-between gap-2">
                  <Icon aria-hidden className="text-mute size-5" strokeWidth={1.75} />
                  <span className="border-ink/15 text-faint rounded-md border bg-white px-2 py-1 font-mono text-[10px] font-medium tracking-[0.12em] uppercase">
                    {t("marketing.roadmap.notADeadline")}
                  </span>
                </div>
                <div>
                  <h3 className="text-ink text-[1.05rem] leading-snug font-bold tracking-[-0.02em]">
                    {t(item.titleKey)}
                  </h3>
                  <p className="text-mute mt-2 text-sm leading-relaxed">{t(item.bodyKey)}</p>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
