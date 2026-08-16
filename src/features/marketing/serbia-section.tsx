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
import type { TranslationKey } from "@/lib/i18n";

const ITEMS: Array<{
  icon: typeof Languages;
  titleKey: TranslationKey;
  bodyKey: TranslationKey;
}> = [
  { icon: Languages, titleKey: "marketing.serbia.languageTitle", bodyKey: "marketing.serbia.languageBody" },
  { icon: Coins, titleKey: "marketing.serbia.currencyTitle", bodyKey: "marketing.serbia.currencyBody" },
  { icon: QrCode, titleKey: "marketing.serbia.qrTitle", bodyKey: "marketing.serbia.qrBody" },
  { icon: FileCheck, titleKey: "marketing.serbia.sefTitle", bodyKey: "marketing.serbia.sefBody" },
  { icon: ShieldCheck, titleKey: "marketing.serbia.kycTitle", bodyKey: "marketing.serbia.kycBody" },
  { icon: Percent, titleKey: "marketing.serbia.vatTitle", bodyKey: "marketing.serbia.vatBody" },
  { icon: FileSignature, titleKey: "marketing.serbia.contractsTitle", bodyKey: "marketing.serbia.contractsBody" },
  { icon: FileSpreadsheet, titleKey: "marketing.serbia.importTitle", bodyKey: "marketing.serbia.importBody" },
];

export function SerbiaSection() {
  const t = useT();

  return (
    <section
      aria-labelledby="serbia-title"
      className="border-t border-[var(--color-border)]"
    >
      <div className="container-app py-16 sm:py-20">
        <div className="max-w-3xl">
          <div className="text-xs font-semibold uppercase tracking-wider text-[var(--color-brand-700)]">
            {t("marketing.serbia.eyebrow")}
          </div>
          <h2
            id="serbia-title"
            className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl"
          >
            {t("marketing.serbia.title")}
          </h2>
          <p className="mt-4 text-base leading-relaxed text-[var(--color-foreground-muted)]">
            {t("marketing.serbia.subtitle")}
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ITEMS.map((it) => {
            const Icon = it.icon;
            return (
              <div
                key={it.titleKey}
                className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-sm"
              >
                <span
                  aria-hidden
                  className="inline-grid h-10 w-10 place-items-center rounded-lg bg-[var(--color-brand-50)] text-[var(--color-brand-700)]"
                >
                  <Icon className="size-5" />
                </span>
                <h3 className="mt-4 text-base font-semibold">{t(it.titleKey)}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-[var(--color-foreground-muted)]">
                  {t(it.bodyKey)}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
