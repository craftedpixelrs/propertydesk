import type { Metadata } from "next";
import Link from "next/link";
import { Mail, Phone } from "lucide-react";

import { marketingCta } from "@/features/marketing/marketing-cta";
import { COMPANY } from "@/lib/constants/app";
import { buildLandingMetadata, LandingJsonLd } from "@/features/marketing/landing/landing-shell";
import { createT } from "@/lib/i18n";
import { resolveRequestLocale } from "@/lib/i18n/resolve-locale";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await resolveRequestLocale();
  const t = createT(locale);
  return buildLandingMetadata({
    slug: "o-nama",
    title: t("marketing.about.metaTitle"),
    description: t("marketing.about.metaDescription"),
    locale,
  });
}

export default async function AboutPage() {
  const locale = await resolveRequestLocale();
  const t = createT(locale);

  return (
    <>
      <article className="container-app max-w-3xl py-14 sm:py-16">
        <p className="text-xs font-semibold tracking-[0.18em] text-[#9a7430] uppercase">
          {t("marketing.about.eyebrow")}
        </p>
        <h1 className="font-display mt-3 text-4xl font-semibold tracking-tight text-[#0b1020] sm:text-5xl">
          {t("marketing.about.title")}
        </h1>
        <p className="mt-4 text-base leading-relaxed text-[var(--color-foreground-muted)]">
          {t("marketing.about.lead")}
        </p>

        <section className="mt-10 space-y-3">
          <h2 className="text-lg font-semibold tracking-tight">{t("marketing.about.whoTitle")}</h2>
          <p className="text-sm leading-relaxed text-[var(--color-foreground-muted)]">
            {t("marketing.about.whoBody")}
          </p>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="text-lg font-semibold tracking-tight">{t("marketing.about.whyTitle")}</h2>
          <p className="text-sm leading-relaxed text-[var(--color-foreground-muted)]">
            {t("marketing.about.whyBody")}
          </p>
        </section>

        <section className="mt-8 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-6">
          <h2 className="text-lg font-semibold tracking-tight">
            {t("marketing.about.contactTitle")}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-[var(--color-foreground-muted)]">
            {t("marketing.about.contactBody")}
          </p>
          <ul className="mt-4 space-y-2 text-sm">
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
                href={`tel:${COMPANY.phoneTel}`}
                className="inline-flex items-center gap-1.5 font-medium text-[#0b1020] underline decoration-[#d6b26a] decoration-2 underline-offset-4 hover:text-[#9a7430]"
              >
                <Phone aria-hidden className="size-4" />
                {COMPANY.phoneDisplay}
              </a>
            </li>
          </ul>
          <div className="mt-6 flex flex-wrap gap-2">
            <Link href="/demo" className={marketingCta("ink", "sm")}>
              {t("marketing.header.bookDemo")}
            </Link>
            <Link href="/impresum" className={marketingCta("outline", "sm")}>
              {t("marketing.nav.imprint")}
            </Link>
          </div>
        </section>
      </article>
      <LandingJsonLd
        slug="o-nama"
        title={t("marketing.about.metaTitle")}
        description={t("marketing.about.metaDescription")}
        locale={locale}
        breadcrumb={t("marketing.nav.about")}
      />
    </>
  );
}
