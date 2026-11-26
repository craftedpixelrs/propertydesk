"use client";

import {
  QrCode,
  FileCheck,
  Languages,
  Coins,
  FileSpreadsheet,
  ShieldCheck,
  Percent,
  FileSignature,
} from "lucide-react";

import { useT } from "@/components/app/i18n-provider";
import { Index, SectionHeading } from "@/features/marketing/ui";
import type { TranslationKey } from "@/lib/i18n";

const ITEMS: Array<{
  icon: typeof Languages;
  titleKey: TranslationKey;
  bodyKey: TranslationKey;
}> = [
  {
    icon: Languages,
    titleKey: "marketing.serbia.languageTitle",
    bodyKey: "marketing.serbia.languageBody",
  },
  {
    icon: Coins,
    titleKey: "marketing.serbia.currencyTitle",
    bodyKey: "marketing.serbia.currencyBody",
  },
  { icon: QrCode, titleKey: "marketing.serbia.qrTitle", bodyKey: "marketing.serbia.qrBody" },
  { icon: FileCheck, titleKey: "marketing.serbia.sefTitle", bodyKey: "marketing.serbia.sefBody" },
  { icon: ShieldCheck, titleKey: "marketing.serbia.kycTitle", bodyKey: "marketing.serbia.kycBody" },
  { icon: Percent, titleKey: "marketing.serbia.vatTitle", bodyKey: "marketing.serbia.vatBody" },
  {
    icon: FileSignature,
    titleKey: "marketing.serbia.contractsTitle",
    bodyKey: "marketing.serbia.contractsBody",
  },
  {
    icon: FileSpreadsheet,
    titleKey: "marketing.serbia.importTitle",
    bodyKey: "marketing.serbia.importBody",
  },
];

/** Local rules, on the navy band: eight ruled cells, no cards. */
export function SerbiaSection() {
  const t = useT();

  return (
    <section aria-labelledby="serbia-title" className="bg-ink-950 relative overflow-hidden">
      <div
        aria-hidden
        className="pd-grid pd-grid-dark pd-fade-b pointer-events-none absolute inset-0"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 right-0 h-96 w-[44rem] rounded-full bg-[radial-gradient(closest-side,rgba(95,210,216,0.14),transparent)]"
      />
      <div className="container-app relative py-20 sm:py-28">
        <SectionHeading
          id="serbia-title"
          tone="dark"
          eyebrow={t("marketing.serbia.eyebrow")}
          title={t("marketing.serbia.title")}
          subtitle={t("marketing.serbia.subtitle")}
        />

        <div
          data-reveal=""
          className="mt-12 grid gap-px overflow-hidden rounded-3xl border border-white/10 bg-white/10 sm:grid-cols-2 lg:grid-cols-4"
        >
          {ITEMS.map((it, index) => {
            const Icon = it.icon;
            return (
              <div
                key={it.titleKey}
                className="bg-ink-950 hover:bg-ink p-6 transition-colors duration-300"
              >
                <div className="flex items-center justify-between">
                  <Icon aria-hidden className="text-tide-300 size-5" strokeWidth={1.75} />
                  <Index n={index + 1} tone="dark" className="text-white/30" />
                </div>
                <h3 className="mt-6 text-[1.05rem] leading-snug font-bold tracking-[-0.02em] text-white">
                  {t(it.titleKey)}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-white/55">{t(it.bodyKey)}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
