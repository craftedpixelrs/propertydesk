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

export function SerbiaSection() {
  const t = useT();

  return (
    <section
      aria-labelledby="serbia-title"
      className="relative overflow-hidden bg-[#0b1020] text-[#f7f3ea]"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute top-0 -left-24 size-80 rounded-full bg-[#d6b26a]/15 blur-3xl"
      />
      <div className="container-app relative py-16 sm:py-24">
        <div className="max-w-3xl">
          <div className="text-xs font-semibold tracking-[0.18em] text-[#d6b26a] uppercase">
            {t("marketing.serbia.eyebrow")}
          </div>
          <h2
            id="serbia-title"
            className="font-display mt-3 text-4xl font-semibold tracking-tight sm:text-5xl"
          >
            {t("marketing.serbia.title")}
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/65">
            {t("marketing.serbia.subtitle")}
          </p>
        </div>

        <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {ITEMS.map((it, index) => {
            const Icon = it.icon;
            return (
              <div
                key={it.titleKey}
                data-reveal=""
                style={{ "--pd-delay": `${(index % 4) * 70}ms` } as React.CSSProperties}
                className="rounded-2xl border border-white/10 bg-white/[0.04] p-5"
              >
                <span
                  aria-hidden
                  className="inline-grid size-10 place-items-center rounded-xl bg-[#d6b26a]/15 text-[#f3e2bc]"
                >
                  <Icon className="size-5" />
                </span>
                <h3 className="font-display mt-4 text-lg font-semibold">{t(it.titleKey)}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-white/60">{t(it.bodyKey)}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
