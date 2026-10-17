"use client";

import { Mail, Phone, Building2, ShieldCheck } from "lucide-react";

import { COMPANY } from "@/lib/constants/app";
import { useT } from "@/components/app/i18n-provider";

export function SocialProof() {
  const t = useT();

  return (
    <section aria-labelledby="proof-title" className="bg-white">
      <div className="container-app py-16 sm:py-24">
        <div className="max-w-3xl">
          <div className="text-xs font-semibold tracking-[0.18em] text-[#9a7430] uppercase">
            {t("marketing.proof.eyebrow")}
          </div>
          <h2
            id="proof-title"
            className="font-display mt-3 text-4xl font-semibold tracking-tight text-[#0b1020] sm:text-5xl"
          >
            {t("marketing.proof.title")}
          </h2>
          <p className="mt-4 text-base leading-relaxed text-[var(--color-foreground-muted)]">
            {t("marketing.proof.subtitle")}
          </p>
        </div>

        <div className="mt-10">
          <div className="mb-3 text-xs font-semibold tracking-wider text-[var(--color-foreground-subtle)] uppercase">
            {t("marketing.proof.pilots")}
          </div>
          <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface-muted)] px-5 py-6 sm:px-8">
            <p className="text-sm leading-relaxed text-[var(--color-foreground-muted)]">
              {t("marketing.proof.pilotsHint")}
            </p>
            <a
              href="/demo"
              className="mt-4 inline-flex text-sm font-semibold text-[#0b1020] underline decoration-[#d6b26a] decoration-2 underline-offset-4 hover:text-[#9a7430]"
            >
              {t("marketing.proof.pilotsCta")}
            </a>
          </div>
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
          <FounderCard />
          <CompanyCard />
        </div>
      </div>
    </section>
  );
}

function FounderCard() {
  const t = useT();
  return (
    <article className="rounded-3xl border border-[var(--color-border)] bg-[#f7f3ea] p-6 sm:p-8">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
        <div
          aria-hidden
          className="font-display grid h-28 w-28 flex-none place-items-center overflow-hidden rounded-2xl bg-[#0b1020] text-4xl text-[#f3e2bc]"
        >
          MB
        </div>
        <div className="min-w-0">
          <div className="text-xs font-semibold tracking-[0.16em] text-[#9a7430] uppercase">
            {t("marketing.proof.founder")}
          </div>
          <h3 className="font-display mt-1 text-2xl font-semibold text-[#0b1020]">Marko Banović</h3>
          <p className="mt-3 text-sm leading-relaxed text-[var(--color-foreground-muted)]">
            {t("marketing.proof.founderBio")}
          </p>
          <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm">
            <li>
              <a
                href={`mailto:${COMPANY.email}`}
                className="inline-flex items-center gap-1.5 font-medium text-[#0b1020] underline decoration-[#d6b26a] decoration-2 underline-offset-4 hover:text-[#9a7430]"
              >
                <Mail aria-hidden className="size-4" />
                {COMPANY.email}
              </a>
            </li>
            <li>
              <a
                href="tel:+381654363142"
                className="inline-flex items-center gap-1.5 font-medium text-[#0b1020] underline decoration-[#d6b26a] decoration-2 underline-offset-4 hover:text-[#9a7430]"
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
    <article className="rounded-3xl bg-[#0b1020] p-6 text-[#f7f3ea] sm:p-8">
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="grid size-10 flex-none place-items-center rounded-xl bg-[#d6b26a]/20 text-[#f3e2bc]"
        >
          <Building2 className="size-5" />
        </span>
        <div>
          <div className="text-xs font-semibold tracking-[0.16em] text-[#d6b26a] uppercase">
            {t("marketing.proof.behind")}
          </div>
          <h3 className="font-display mt-1 text-2xl font-semibold">CraftedPixel</h3>
        </div>
      </div>
      <p className="mt-4 text-sm leading-relaxed text-white/65">
        {t("marketing.proof.companyBio")}
      </p>
      <div className="mt-5 flex flex-wrap items-center gap-3 text-xs text-white/70">
        <span className="inline-flex items-center gap-1.5">
          <ShieldCheck aria-hidden className="size-4 text-[#d6b26a]" />
          {t("marketing.proof.dataEu")}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <ShieldCheck aria-hidden className="size-4 text-[#d6b26a]" />
          {t("marketing.proof.encryption")}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <ShieldCheck aria-hidden className="size-4 text-[#d6b26a]" />
          {t("marketing.proof.audit")}
        </span>
      </div>
    </article>
  );
}
