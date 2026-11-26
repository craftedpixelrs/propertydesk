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
import { BrowserFrame, type AppScreen } from "@/features/marketing/mockup-frame";
import { Index, SectionHeading } from "@/features/marketing/ui";
import { LANDING_IMAGES } from "@/lib/constants/app";
import type { TranslationKey } from "@/lib/i18n";

interface Feature {
  icon: LucideIcon;
  titleKey: TranslationKey;
  bodyKey: TranslationKey;
  /** Features with a screen open the section as large cards. */
  screen?: AppScreen;
}

const SCREENS = LANDING_IMAGES.screens;

const FEATURES: Feature[] = [
  {
    icon: Building2,
    titleKey: "marketing.features.items.projects.title",
    bodyKey: "marketing.features.items.projects.description",
    screen: SCREENS.units,
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
    screen: SCREENS.reservations,
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
    screen: SCREENS.sale,
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
    screen: SCREENS.payments,
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

const SHOWN = FEATURES.filter((f) => f.screen);
const LISTED = FEATURES.filter((f) => !f.screen);

function IconTile({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <span
      aria-hidden
      className="border-line text-tide-700 grid size-10 place-items-center rounded-[10px] border bg-white"
    >
      <Icon className="size-[1.1rem]" strokeWidth={1.75} />
    </span>
  );
}

/**
 * What the product does. The four flows a sale runs through are shown
 * as real screens; the rest is a ruled list, numbered like a drawing.
 */
export function FeatureGrid() {
  const t = useT();
  const [lead, ...others] = SHOWN;

  return (
    <section id="mogucnosti" aria-labelledby="features-title" className="scroll-mt-20">
      <div className="container-app py-20 sm:py-28">
        <SectionHeading
          id="features-title"
          eyebrow={t("marketing.features.eyebrow")}
          title={t("marketing.features.title")}
          subtitle={t("marketing.features.subtitle")}
        />

        {lead?.screen ? (
          <article
            data-reveal=""
            className="border-line mt-12 grid overflow-hidden rounded-3xl border bg-white lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]"
          >
            <div className="flex flex-col justify-between gap-10 p-6 sm:p-9">
              <div className="flex items-center justify-between">
                <IconTile icon={lead.icon} />
                <Index n={1} />
              </div>
              <div>
                <h3 className="text-ink text-2xl leading-tight font-bold tracking-[-0.03em] sm:text-[2rem]">
                  {t(lead.titleKey)}
                </h3>
                <p className="text-mute mt-3 text-base leading-relaxed">{t(lead.bodyKey)}</p>
              </div>
            </div>
            <div className="bg-paper border-line pd-grid relative border-t pt-6 pl-6 sm:pt-9 sm:pl-9 lg:border-t-0 lg:border-l">
              <BrowserFrame
                screen={lead.screen}
                alt={t(lead.titleKey)}
                sizes="(min-width: 1024px) 800px, 170vw"
                crop="aspect-[16/10]"
                detail="phone"
                className="rounded-tr-none rounded-b-none border-r-0 border-b-0"
              />
            </div>
          </article>
        ) : null}

        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          {others.map((f, index) =>
            f.screen ? (
              <article
                key={f.titleKey}
                data-reveal=""
                style={{ "--pd-delay": `${index * 90}ms` } as React.CSSProperties}
                className="border-line flex flex-col overflow-hidden rounded-3xl border bg-white"
              >
                <div className="p-6 sm:p-7">
                  <div className="flex items-center justify-between">
                    <IconTile icon={f.icon} />
                    <Index n={index + 2} />
                  </div>
                  <h3 className="text-ink mt-6 text-xl leading-tight font-bold tracking-[-0.025em]">
                    {t(f.titleKey)}
                  </h3>
                  <p className="text-mute mt-2.5 text-sm leading-relaxed">{t(f.bodyKey)}</p>
                </div>
                <div className="bg-paper border-line pd-grid mt-auto border-t pt-6 pl-6">
                  <BrowserFrame
                    screen={f.screen}
                    alt={t(f.titleKey)}
                    sizes="(min-width: 1024px) 680px, 170vw"
                    crop="aspect-[16/10]"
                    detail
                    className="rounded-tr-none rounded-b-none border-r-0 border-b-0"
                  />
                </div>
              </article>
            ) : null,
          )}
        </div>

        <div
          data-reveal=""
          className="border-line bg-line mt-4 grid gap-px overflow-hidden rounded-3xl border sm:grid-cols-2 lg:grid-cols-3"
        >
          {LISTED.map((f, index) => (
            <article
              key={f.titleKey}
              className="bg-white p-6 transition-colors duration-300 hover:bg-[#f7fbfc] sm:p-7 sm:last:col-span-2 lg:last:col-span-1"
            >
              <div className="flex items-center justify-between">
                <IconTile icon={f.icon} />
                <Index n={index + SHOWN.length + 1} />
              </div>
              <h3 className="text-ink mt-5 text-[1.05rem] leading-snug font-bold tracking-[-0.02em]">
                {t(f.titleKey)}
              </h3>
              <p className="text-mute mt-2 text-sm leading-relaxed">{t(f.bodyKey)}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
