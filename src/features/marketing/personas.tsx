"use client";

import { Check, Building2, Users } from "lucide-react";

import { LANDING_IMAGES } from "@/lib/constants/app";
import { MockupFrame } from "@/features/marketing/mockup-frame";
import { useT } from "@/components/app/i18n-provider";

interface PersonaCardProps {
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  eyebrow: string;
  title: string;
  description: string;
  items: string[];
  tone?: "ink" | "light";
  delay?: number;
}

function PersonaCard({
  icon: Icon,
  eyebrow,
  title,
  description,
  items,
  tone = "light",
  delay = 0,
}: PersonaCardProps) {
  const ink = tone === "ink";
  return (
    <article
      data-reveal=""
      style={{ "--pd-delay": `${delay}ms` } as React.CSSProperties}
      className={
        ink
          ? "relative flex h-full flex-col overflow-hidden rounded-3xl bg-[#0b1020] p-6 text-[#f7f3ea] sm:p-8"
          : "flex h-full flex-col rounded-3xl border border-[var(--color-border)] bg-white p-6 shadow-[0_20px_50px_-36px_rgba(11,16,32,0.45)] sm:p-8"
      }
    >
      {ink ? (
        <div
          aria-hidden
          className="pointer-events-none absolute -top-16 -right-10 size-40 rounded-full bg-[#d6b26a]/20 blur-3xl"
        />
      ) : null}
      <div className="relative flex items-center gap-3">
        <span
          aria-hidden
          className={
            ink
              ? "grid size-11 place-items-center rounded-xl bg-white/10 text-[#f3e2bc]"
              : "grid size-11 place-items-center rounded-xl bg-[#0b1020] text-[#f3e2bc]"
          }
        >
          <Icon className="size-5" aria-hidden />
        </span>
        <div
          className={
            ink
              ? "text-xs font-semibold tracking-[0.16em] text-[#d6b26a] uppercase"
              : "text-xs font-semibold tracking-[0.16em] text-[#9a7430] uppercase"
          }
        >
          {eyebrow}
        </div>
      </div>
      <h3 className="font-display relative mt-5 text-3xl font-semibold tracking-tight">{title}</h3>
      <p
        className={
          ink
            ? "relative mt-3 text-sm leading-relaxed text-white/70"
            : "relative mt-3 text-sm leading-relaxed text-[var(--color-foreground-muted)]"
        }
      >
        {description}
      </p>
      <ul className="relative mt-6 space-y-2.5">
        {items.map((it) => (
          <li key={it} className="flex items-start gap-2.5 text-sm">
            <Check
              aria-hidden
              className={
                ink
                  ? "mt-0.5 size-4 flex-none text-[#d6b26a]"
                  : "mt-0.5 size-4 flex-none text-[#9a7430]"
              }
            />
            <span className={ink ? "text-[#f7f3ea]" : "text-[var(--color-foreground)]"}>{it}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}

export function Personas() {
  const t = useT();

  return (
    <section id="za-koga" aria-labelledby="personas-title" className="scroll-mt-20 bg-[#f7f3ea]">
      <div className="container-app py-16 sm:py-24">
        <div className="max-w-3xl">
          <div className="text-xs font-semibold tracking-[0.18em] text-[#9a7430] uppercase">
            {t("marketing.personas.eyebrow")}
          </div>
          <h2
            id="personas-title"
            className="font-display mt-3 text-4xl font-semibold tracking-tight text-[#0b1020] sm:text-5xl"
          >
            {t("marketing.personas.title")}
          </h2>
          <p className="mt-4 text-base leading-relaxed text-[var(--color-foreground-muted)]">
            {t("marketing.personas.subtitle")}
          </p>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <PersonaCard
            tone="ink"
            icon={Building2}
            eyebrow={t("marketing.personas.investorEyebrow")}
            title={t("marketing.personas.investorTitle")}
            description={t("marketing.personas.investorDescription")}
            delay={0}
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
          <PersonaCard
            icon={Users}
            eyebrow={t("marketing.personas.agencyEyebrow")}
            title={t("marketing.personas.agencyTitle")}
            description={t("marketing.personas.agencyDescription")}
            delay={120}
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
        </div>

        <div className="mt-12 flex justify-center">
          <MockupFrame
            variant="mobile"
            src={LANDING_IMAGES.personasMobile?.src}
            width={LANDING_IMAGES.personasMobile?.width}
            height={LANDING_IMAGES.personasMobile?.height}
            alt={t("marketing.personas.mobileAlt")}
            label={t("marketing.personas.mobileLabel")}
          />
        </div>
      </div>
    </section>
  );
}
