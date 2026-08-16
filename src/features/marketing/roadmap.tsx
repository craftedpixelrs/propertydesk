"use client";

import type { LucideIcon } from "lucide-react";
import {
  Blocks,
  Bot,
  FileSignature,
  Network,
  SearchCheck,
  Zap,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { useT } from "@/components/app/i18n-provider";
import type { TranslationKey } from "@/lib/i18n";

interface RoadmapItem {
  icon: LucideIcon;
  titleKey: TranslationKey;
  bodyKey: TranslationKey;
  eta: string;
}

const ROADMAP: RoadmapItem[] = [
  { icon: Blocks, titleKey: "marketing.roadmap.wpTitle", bodyKey: "marketing.roadmap.wpBody", eta: "Q4 2026" },
  { icon: Bot, titleKey: "marketing.roadmap.aiTitle", bodyKey: "marketing.roadmap.aiBody", eta: "Q1 2027" },
  { icon: SearchCheck, titleKey: "marketing.roadmap.qualifyTitle", bodyKey: "marketing.roadmap.qualifyBody", eta: "Q1 2027" },
  { icon: Zap, titleKey: "marketing.roadmap.leadsTitle", bodyKey: "marketing.roadmap.leadsBody", eta: "Q2 2027" },
  { icon: FileSignature, titleKey: "marketing.roadmap.signTitle", bodyKey: "marketing.roadmap.signBody", eta: "Q2 2027" },
  { icon: Network, titleKey: "marketing.roadmap.marketTitle", bodyKey: "marketing.roadmap.marketBody", eta: "Q3 2027" },
];

export function Roadmap() {
  const t = useT();

  return (
    <section
      id="uskoro"
      aria-labelledby="roadmap-title"
      className="scroll-mt-20 border-t border-[var(--color-border)] bg-[var(--color-surface-muted)]"
    >
      <div className="container-app py-14 sm:py-16">
        <div className="max-w-3xl">
          <div className="text-xs font-semibold uppercase tracking-wider text-[var(--color-brand-700)]">
            {t("marketing.roadmap.eyebrow")}
          </div>
          <h2
            id="roadmap-title"
            className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl"
          >
            {t("marketing.roadmap.title")}
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[var(--color-foreground-muted)]">
            {t("marketing.roadmap.subtitle")}
          </p>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ROADMAP.map((item) => {
            const Icon = item.icon;
            return (
              <article
                key={item.titleKey}
                className="flex flex-col gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    aria-hidden
                    className="grid h-9 w-9 flex-none place-items-center rounded-lg bg-[var(--color-brand-50)] text-[var(--color-brand-700)]"
                  >
                    <Icon className="size-4" />
                  </span>
                  <Badge tone="neutral" className="uppercase tracking-wide">
                    {item.eta}
                  </Badge>
                </div>
                <div>
                  <h3 className="text-base font-semibold text-[var(--color-foreground)]">
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
