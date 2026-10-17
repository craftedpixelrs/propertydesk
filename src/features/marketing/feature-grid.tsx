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
    <section id="mogucnosti" aria-labelledby="features-title" className="scroll-mt-20">
      <div className="container-app py-16 sm:py-20">
        <div className="max-w-3xl">
          <div className="text-xs font-semibold tracking-[0.18em] text-[#9a7430] uppercase">
            {t("marketing.features.eyebrow")}
          </div>
          <h2
            id="features-title"
            className="font-display mt-3 text-4xl font-semibold tracking-tight text-[#0b1020] sm:text-5xl"
          >
            {t("marketing.features.title")}
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-[var(--color-foreground-muted)]">
            {t("marketing.features.subtitle")}
          </p>
        </div>

        <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, index) => {
            const Icon = f.icon;
            const lead = index < 2;
            return (
              <article
                key={f.titleKey}
                data-reveal=""
                style={{ "--pd-delay": `${(index % 3) * 80}ms` } as React.CSSProperties}
                className={
                  lead
                    ? "group relative overflow-hidden rounded-2xl border border-[#0b1020] bg-[#0b1020] p-6 text-[#f7f3ea] sm:col-span-1 lg:p-7"
                    : "group rounded-2xl border border-[#0b1020]/10 bg-white p-5 transition hover:-translate-y-0.5 hover:border-[#d6b26a] hover:shadow-[0_16px_40px_-28px_rgba(11,16,32,0.35)]"
                }
              >
                {lead ? (
                  <div
                    aria-hidden
                    className="pointer-events-none absolute -top-10 -right-8 size-32 rounded-full bg-[#d6b26a]/20 blur-2xl"
                  />
                ) : null}
                <span
                  aria-hidden
                  className={
                    lead
                      ? "grid size-11 place-items-center rounded-xl bg-white/10 text-[#f3e2bc]"
                      : "grid size-10 place-items-center rounded-xl bg-[#0b1020] text-[#f3e2bc]"
                  }
                >
                  <Icon className="size-5" />
                </span>
                <h3
                  className={
                    lead
                      ? "font-display mt-5 text-2xl font-semibold tracking-tight"
                      : "font-display mt-4 text-lg font-semibold text-[#0b1020]"
                  }
                >
                  {t(f.titleKey)}
                </h3>
                <p
                  className={
                    lead
                      ? "mt-2 text-sm leading-relaxed text-white/70"
                      : "mt-1.5 text-sm leading-relaxed text-[var(--color-foreground-muted)]"
                  }
                >
                  {t(f.bodyKey)}
                </p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
