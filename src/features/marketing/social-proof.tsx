"use client";

import { Mail, Phone, Building2, ShieldCheck } from "lucide-react";

import { useT } from "@/components/app/i18n-provider";

export function SocialProof() {
  const t = useT();
  const pilotSlots = [
    t("marketing.proof.investor"),
    t("marketing.proof.investor"),
    t("marketing.proof.agency"),
    t("marketing.proof.agency"),
    t("marketing.proof.investor"),
    t("marketing.proof.agency"),
  ];

  return (
    <section
      aria-labelledby="proof-title"
      className="bg-white"
    >
      <div className="container-app py-16 sm:py-20">
        <div className="max-w-3xl">
          <div className="text-xs font-semibold uppercase tracking-wider text-[var(--color-brand-700)]">
            {t("marketing.proof.eyebrow")}
          </div>
          <h2
            id="proof-title"
            className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl"
          >
            {t("marketing.proof.title")}
          </h2>
          <p className="mt-4 text-base leading-relaxed text-[var(--color-foreground-muted)]">
            {t("marketing.proof.subtitle")}
          </p>
        </div>

        <div className="mt-10">
          <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-foreground-subtle)]">
            {t("marketing.proof.pilots")}
          </div>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {pilotSlots.map((label, i) => (
              <PilotLogoSlot key={i} label={label} slotAria={t("marketing.proof.slotAria")} yourLogo={t("marketing.proof.yourLogo")} />
            ))}
          </ul>
          <p className="mt-3 text-xs text-[var(--color-foreground-subtle)]">
            {t("marketing.proof.pilotsHint")}
          </p>
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
          <FounderCard />
          <CompanyCard />
        </div>
      </div>
    </section>
  );
}

function PilotLogoSlot({
  label,
  slotAria,
  yourLogo,
}: {
  label: string;
  slotAria: string;
  yourLogo: string;
}) {
  return (
    <li
      aria-label={slotAria}
      className="flex h-20 items-center justify-center rounded-lg border border-dashed border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3"
    >
      <div className="text-center">
        <div className="text-sm font-semibold text-[var(--color-foreground-muted)]">
          {yourLogo}
        </div>
        <div className="mt-0.5 text-[10px] uppercase tracking-wider text-[var(--color-foreground-subtle)]">
          {label}
        </div>
      </div>
    </li>
  );
}

function FounderCard() {
  const t = useT();
  return (
    <article className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm sm:p-8">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
        <div
          aria-hidden
          className="grid h-28 w-28 flex-none place-items-center overflow-hidden rounded-2xl bg-gradient-to-br from-[var(--color-brand-500)] to-[var(--color-brand-800)] text-4xl font-bold text-white ring-1 ring-[var(--color-border)]"
        >
          MB
        </div>
        <div className="min-w-0">
          <div className="text-xs font-semibold uppercase tracking-wider text-[var(--color-brand-700)]">
            {t("marketing.proof.founder")}
          </div>
          <h3 className="mt-1 text-xl font-bold text-[var(--color-foreground)]">
            Marko Banović
          </h3>
          <p className="mt-3 text-sm leading-relaxed text-[var(--color-foreground-muted)]">
            {t("marketing.proof.founderBio")}
          </p>
          <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm">
            <li>
              <a
                href="mailto:marko.banovic@craftedpixel.rs"
                className="inline-flex items-center gap-1.5 font-medium text-[var(--color-brand-700)] hover:underline"
              >
                <Mail aria-hidden className="size-4" />
                marko.banovic@craftedpixel.rs
              </a>
            </li>
            <li>
              <a
                href="tel:+381654363142"
                className="inline-flex items-center gap-1.5 font-medium text-[var(--color-brand-700)] hover:underline"
              >
                <Phone aria-hidden className="size-4" />
                +381 65 43 63 142
              </a>
            </li>
          </ul>
        </div>
      </div>
    </article>
  );
}

function CompanyCard() {
  const t = useT();
  return (
    <article className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-brand-50)] p-6 shadow-sm sm:p-8">
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="grid h-10 w-10 flex-none place-items-center rounded-lg bg-[var(--color-brand-600)] text-white"
        >
          <Building2 className="size-5" />
        </span>
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-[var(--color-brand-700)]">
            {t("marketing.proof.behind")}
          </div>
          <h3 className="mt-1 text-xl font-bold text-[var(--color-foreground)]">
            CraftedPixel
          </h3>
        </div>
      </div>
      <p className="mt-4 text-sm leading-relaxed text-[var(--color-foreground-muted)]">
        {t("marketing.proof.companyBio")}
      </p>
      <div className="mt-5 flex flex-wrap items-center gap-3 text-xs text-[var(--color-foreground-muted)]">
        <span className="inline-flex items-center gap-1.5">
          <ShieldCheck aria-hidden className="size-4 text-[var(--color-brand-700)]" />
          {t("marketing.proof.dataEu")}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <ShieldCheck aria-hidden className="size-4 text-[var(--color-brand-700)]" />
          {t("marketing.proof.encryption")}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <ShieldCheck aria-hidden className="size-4 text-[var(--color-brand-700)]" />
          {t("marketing.proof.audit")}
        </span>
      </div>
    </article>
  );
}
