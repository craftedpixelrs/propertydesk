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
}

function PersonaCard({
  icon: Icon,
  eyebrow,
  title,
  description,
  items,
}: PersonaCardProps) {
  return (
    <article className="flex h-full flex-col rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm sm:p-8">
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="grid h-11 w-11 place-items-center rounded-lg bg-[var(--color-brand-50)] text-[var(--color-brand-700)]"
        >
          <Icon className="size-5" aria-hidden />
        </span>
        <div className="text-xs font-semibold uppercase tracking-wider text-[var(--color-brand-700)]">
          {eyebrow}
        </div>
      </div>
      <h3 className="mt-4 text-2xl font-bold tracking-tight">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-[var(--color-foreground-muted)]">
        {description}
      </p>
      <ul className="mt-5 space-y-2.5">
        {items.map((it) => (
          <li key={it} className="flex items-start gap-2.5 text-sm">
            <Check
              aria-hidden
              className="mt-0.5 size-4 flex-none text-[var(--color-success)]"
            />
            <span className="text-[var(--color-foreground)]">{it}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}

export function Personas() {
  const t = useT();

  return (
    <section
      id="za-koga"
      aria-labelledby="personas-title"
      className="scroll-mt-20 bg-[var(--color-surface-muted)]"
    >
      <div className="container-app py-16 sm:py-20">
        <div className="max-w-3xl">
          <div className="text-xs font-semibold uppercase tracking-wider text-[var(--color-brand-700)]">
            {t("marketing.personas.eyebrow")}
          </div>
          <h2
            id="personas-title"
            className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl"
          >
            {t("marketing.personas.title")}
          </h2>
          <p className="mt-4 text-base leading-relaxed text-[var(--color-foreground-muted)]">
            {t("marketing.personas.subtitle")}
          </p>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <PersonaCard
            icon={Building2}
            eyebrow={t("marketing.personas.investorEyebrow")}
            title={t("marketing.personas.investorTitle")}
            description={t("marketing.personas.investorDescription")}
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
