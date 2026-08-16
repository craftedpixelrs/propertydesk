"use client";

import type { LucideIcon } from "lucide-react";
import {
  Building2,
  LayoutGrid,
  Contact,
  BadgeCheck,
  Handshake,
  Wallet,
  FileText,
  BarChart3,
  Bell,
  FileSignature,
  QrCode,
  TrendingUp,
  Globe,
} from "lucide-react";

import { useT } from "@/components/app/i18n-provider";
import type { TranslationKey } from "@/lib/i18n";

const FEATURES: Array<{
  icon: LucideIcon;
  titleKey: TranslationKey;
  bodyKey: TranslationKey;
}> = [
  {
    icon: Building2,
    titleKey: "marketing.features.items.projects.title",
    bodyKey: "marketing.features.items.projects.description",
  },
  {
    icon: Contact,
    titleKey: "marketing.features.items.crm.title",
    bodyKey: "marketing.features.items.crm.description",
  },
  {
    icon: BadgeCheck,
    titleKey: "marketing.features.items.reservations.title",
    bodyKey: "marketing.features.items.reservations.description",
  },
  {
    icon: QrCode,
    titleKey: "marketing.features.items.qr.title",
    bodyKey: "marketing.features.items.qr.description",
  },
  {
    icon: Handshake,
    titleKey: "marketing.features.items.sales.title",
    bodyKey: "marketing.features.items.sales.description",
  },
  {
    icon: FileSignature,
    titleKey: "marketing.features.items.contracts.title",
    bodyKey: "marketing.features.items.contracts.description",
  },
  {
    icon: Wallet,
    titleKey: "marketing.features.items.payments.title",
    bodyKey: "marketing.features.items.payments.description",
  },
  {
    icon: LayoutGrid,
    titleKey: "marketing.features.items.commissions.title",
    bodyKey: "marketing.features.items.commissions.description",
  },
  {
    icon: FileText,
    titleKey: "marketing.features.items.documents.title",
    bodyKey: "marketing.features.items.documents.description",
  },
  {
    icon: Globe,
    titleKey: "marketing.features.items.microsite.title",
    bodyKey: "marketing.features.items.microsite.description",
  },
  {
    icon: BarChart3,
    titleKey: "marketing.features.items.reports.title",
    bodyKey: "marketing.features.items.reports.description",
  },
  {
    icon: TrendingUp,
    titleKey: "marketing.features.items.cashflow.title",
    bodyKey: "marketing.features.items.cashflow.description",
  },
  {
    icon: Bell,
    titleKey: "marketing.features.items.automation.title",
    bodyKey: "marketing.features.items.automation.description",
  },
];

export function FeatureGrid() {
  const t = useT();

  return (
    <section
      id="mogucnosti"
      aria-labelledby="features-title"
      className="scroll-mt-20"
    >
      <div className="container-app py-16 sm:py-20">
        <div className="max-w-3xl">
          <div className="text-xs font-semibold uppercase tracking-wider text-[var(--color-brand-700)]">
            {t("marketing.features.eyebrow")}
          </div>
          <h2
            id="features-title"
            className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl"
          >
            {t("marketing.features.title")}
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-[var(--color-foreground-muted)]">
            {t("marketing.features.subtitle")}
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <article
                key={f.titleKey}
                className="group rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-sm transition hover:border-[var(--color-brand-200)] hover:shadow-md"
              >
                <div className="flex items-start gap-3">
                  <span
                    aria-hidden
                    className="grid h-10 w-10 flex-none place-items-center rounded-lg bg-[var(--color-brand-50)] text-[var(--color-brand-700)] transition group-hover:bg-[var(--color-brand-100)]"
                  >
                    <Icon className="size-5" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-base font-semibold text-[var(--color-foreground)]">
                      {t(f.titleKey)}
                    </h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-[var(--color-foreground-muted)]">
                      {t(f.bodyKey)}
                    </p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
