"use client";

import Link from "next/link";
import { ArrowRight, Check, Building2, Handshake, KeyRound, type LucideIcon } from "lucide-react";

import { LANDING_IMAGES } from "@/lib/constants/app";
import { BrowserFrame, type AppScreen } from "@/features/marketing/mockup-frame";
import { Index, SectionHeading } from "@/features/marketing/ui";
import { useT } from "@/components/app/i18n-provider";
import { cn } from "@/lib/utils";

interface PersonaRowProps {
  n: number;
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  description: string;
  items: string[];
  href: string;
  linkLabel: string;
  screen: AppScreen;
  flip?: boolean;
}

/** One side of the chain: what it gets, next to its own portal. */
function PersonaRow({
  n,
  icon: Icon,
  eyebrow,
  title,
  description,
  items,
  href,
  linkLabel,
  screen,
  flip,
}: PersonaRowProps) {
  return (
    <article
      data-reveal=""
      className="border-line grid overflow-hidden rounded-3xl border bg-white lg:grid-cols-2"
    >
      <div className={cn("flex flex-col p-6 sm:p-9", flip && "lg:order-2")}>
        <div className="flex items-center gap-3">
          <span
            aria-hidden
            className="bg-ink text-tide-300 grid size-10 place-items-center rounded-[10px]"
          >
            <Icon className="size-[1.1rem]" strokeWidth={1.75} />
          </span>
          <div className="text-tide-700 font-mono text-[11px] font-medium tracking-[0.16em] uppercase">
            {eyebrow}
          </div>
          <Index n={n} className="text-faint ml-auto" />
        </div>
        <h3 className="text-ink mt-7 text-2xl leading-tight font-bold tracking-[-0.03em] sm:text-[1.8rem]">
          {title}
        </h3>
        <p className="text-mute mt-3 text-[0.95rem] leading-relaxed">{description}</p>
        <ul className="border-line mt-6 border-t">
          {items.map((it) => (
            <li
              key={it}
              className="border-line text-ink flex items-start gap-3 border-b py-2.5 text-sm leading-snug"
            >
              <Check aria-hidden className="text-tide mt-0.5 size-4 flex-none" strokeWidth={2.5} />
              <span>{it}</span>
            </li>
          ))}
        </ul>
        <Link
          href={href}
          className="text-ink hover:text-tide-700 mt-6 inline-flex items-center gap-1.5 self-start text-sm font-semibold transition-colors"
        >
          {linkLabel}
          <ArrowRight aria-hidden className="size-4" />
        </Link>
      </div>
      <div
        className={cn(
          "bg-paper border-line pd-grid flex items-end border-t pt-8 lg:items-center lg:border-t-0 lg:py-10",
          flip ? "pr-6 sm:pr-9 lg:order-1 lg:border-r" : "pl-6 sm:pl-9 lg:border-l",
        )}
      >
        <BrowserFrame
          screen={screen}
          alt={title}
          sizes="(min-width: 1024px) 1000px, 170vw"
          crop="aspect-[16/10] lg:aspect-[10/9]"
          detail
          className={cn(
            "w-full rounded-b-none border-b-0 lg:border-b",
            flip
              ? "rounded-tl-none border-l-0 lg:rounded-br-2xl"
              : "rounded-tr-none border-r-0 lg:rounded-bl-2xl",
          )}
        />
      </div>
    </article>
  );
}

export function Personas() {
  const t = useT();
  const screens = LANDING_IMAGES.screens;

  return (
    <section id="za-koga" aria-labelledby="personas-title" className="scroll-mt-20">
      <div className="container-app py-20 sm:py-28">
        <SectionHeading
          id="personas-title"
          eyebrow={t("marketing.personas.eyebrow")}
          title={t("marketing.personas.title")}
          subtitle={t("marketing.personas.subtitle")}
        />

        <div className="mt-12 grid gap-4">
          <PersonaRow
            n={1}
            icon={Building2}
            eyebrow={t("marketing.personas.investorEyebrow")}
            title={t("marketing.personas.investorTitle")}
            description={t("marketing.personas.investorDescription")}
            href="/za-investitore"
            linkLabel={t("marketing.nav.investors")}
            screen={screens.dashboard}
            items={[
              t("marketing.personas.investor1"),
              t("marketing.personas.investor2"),
              t("marketing.personas.investor3"),
              t("marketing.personas.investor4"),
              t("marketing.personas.investor5"),
              t("marketing.personas.investor6"),
              t("marketing.personas.investor7"),
            ]}
          />
          <PersonaRow
            n={2}
            flip
            icon={Handshake}
            eyebrow={t("marketing.personas.agencyEyebrow")}
            title={t("marketing.personas.agencyTitle")}
            description={t("marketing.personas.agencyDescription")}
            href="/za-agencije"
            linkLabel={t("marketing.nav.agencies")}
            screen={screens.agency}
            items={[
              t("marketing.personas.agency1"),
              t("marketing.personas.agency2"),
              t("marketing.personas.agency3"),
              t("marketing.personas.agency4"),
              t("marketing.personas.agency5"),
              t("marketing.personas.agency6"),
              t("marketing.personas.agency7"),
            ]}
          />
          <PersonaRow
            n={3}
            icon={KeyRound}
            eyebrow={t("marketing.personas.managerEyebrow")}
            title={t("marketing.personas.managerTitle")}
            description={t("marketing.personas.managerDescription")}
            href="/za-upravnike"
            linkLabel={t("marketing.nav.managers")}
            screen={screens.manager}
            items={[
              t("marketing.personas.manager1"),
              t("marketing.personas.manager2"),
              t("marketing.personas.manager3"),
              t("marketing.personas.manager4"),
              t("marketing.personas.manager5"),
              t("marketing.personas.manager6"),
              t("marketing.personas.manager7"),
            ]}
          />
        </div>
      </div>
    </section>
  );
}
