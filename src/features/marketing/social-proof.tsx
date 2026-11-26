import Link from "next/link";
import { ArrowRight, Phone, ShieldCheck } from "lucide-react";

import { COMPANY } from "@/lib/constants/app";
import { EmailLink, MAIL_ICON_HTML } from "@/features/marketing/email-link";
import { SectionHeading } from "@/features/marketing/ui";
import { createT, type TranslateFn } from "@/lib/i18n";
import { resolveRequestLocale } from "@/lib/i18n/resolve-locale";

const CONTACT_LINK =
  "inline-flex items-center gap-1.5 text-sm font-semibold text-ink underline decoration-tide decoration-2 underline-offset-4 transition-colors hover:text-tide-700";

export async function SocialProof() {
  const t = createT(await resolveRequestLocale());

  return (
    <section aria-labelledby="proof-title" className="border-line border-y bg-white">
      <div className="container-app py-20 sm:py-28">
        <SectionHeading
          id="proof-title"
          eyebrow={t("marketing.proof.eyebrow")}
          title={t("marketing.proof.title")}
          subtitle={t("marketing.proof.subtitle")}
        />

        <div className="mt-12 grid gap-4 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
          <FounderCard t={t} />
          <div className="grid gap-4">
            <CompanyCard t={t} />
            <PilotCard t={t} />
          </div>
        </div>
      </div>
    </section>
  );
}

function FounderCard({ t }: { t: TranslateFn }) {
  return (
    <article
      data-reveal=""
      className="border-line bg-paper flex flex-col justify-between gap-8 rounded-3xl border p-6 sm:p-9"
    >
      <div>
        <span
          aria-hidden
          className="text-tide font-mono text-5xl leading-none font-medium select-none"
        >
          “
        </span>
        <p className="text-ink mt-2 text-lg leading-relaxed font-medium tracking-[-0.01em] text-pretty sm:text-xl sm:leading-relaxed">
          {t("marketing.proof.founderBio")}
        </p>
      </div>
      <div className="border-line flex flex-col gap-5 border-t pt-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3.5">
          <span
            aria-hidden
            className="bg-ink text-tide-300 grid size-12 flex-none place-items-center rounded-xl font-mono text-sm font-medium tracking-wider"
          >
            MB
          </span>
          <div>
            <h3 className="text-ink text-base font-bold tracking-[-0.02em]">Marko Banović</h3>
            <div className="text-faint font-mono text-[11px] tracking-[0.14em] uppercase">
              {t("marketing.proof.founder")}
            </div>
          </div>
        </div>
        <ul className="flex flex-wrap gap-x-5 gap-y-2">
          <li>
            <EmailLink email={COMPANY.email} className={CONTACT_LINK} iconHtml={MAIL_ICON_HTML} />
          </li>
          <li>
            <a href="tel:+381654363142" className={CONTACT_LINK}>
              <Phone aria-hidden className="size-4" />
              +381 65 43 63 142
            </a>
          </li>
        </ul>
      </div>
    </article>
  );
}

function CompanyCard({ t }: { t: TranslateFn }) {
  const facts = [
    t("marketing.proof.dataEu"),
    t("marketing.proof.encryption"),
    t("marketing.proof.audit"),
  ];
  return (
    <article
      data-reveal=""
      style={{ "--pd-delay": "90ms" } as React.CSSProperties}
      className="bg-ink relative overflow-hidden rounded-3xl p-6 text-white sm:p-8"
    >
      <div aria-hidden className="pd-grid pd-grid-dark pointer-events-none absolute inset-0" />
      <div className="relative">
        <div className="text-tide-300 font-mono text-[11px] font-medium tracking-[0.16em] uppercase">
          {t("marketing.proof.behind")}
        </div>
        <h3 className="mt-2 text-2xl font-bold tracking-[-0.03em]">CraftedPixel</h3>
        <p className="mt-3 text-sm leading-relaxed text-white/65">
          {t("marketing.proof.companyBio")}
        </p>
        <ul className="mt-6 space-y-2.5 border-t border-white/10 pt-5 text-sm text-white/80">
          {facts.map((fact) => (
            <li key={fact} className="flex items-center gap-2.5">
              <ShieldCheck aria-hidden className="text-tide-300 size-4 flex-none" />
              {fact}
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}

function PilotCard({ t }: { t: TranslateFn }) {
  return (
    <article
      data-reveal=""
      style={{ "--pd-delay": "180ms" } as React.CSSProperties}
      className="pd-hatch border-ink/20 rounded-3xl border border-dashed p-6 sm:p-8"
    >
      <div className="text-faint font-mono text-[11px] font-medium tracking-[0.16em] uppercase">
        {t("marketing.proof.pilots")}
      </div>
      <p className="text-mute mt-3 text-sm leading-relaxed">{t("marketing.proof.pilotsHint")}</p>
      <Link
        href="/demo"
        className="text-ink hover:text-tide-700 mt-4 inline-flex items-center gap-1.5 text-sm font-semibold transition-colors"
      >
        {t("marketing.proof.pilotsCta")}
        <ArrowRight aria-hidden className="size-4" />
      </Link>
    </article>
  );
}
