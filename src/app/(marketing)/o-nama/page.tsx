import type { Metadata } from "next";
import Link from "next/link";
import { Mail, Phone } from "lucide-react";

import { Button } from "@/components/ui/button";
import { COMPANY } from "@/lib/constants/app";
import {
  buildLandingMetadata,
  LandingJsonLd,
} from "@/features/marketing/landing/landing-shell";
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
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-brand-700)]">
          {t("marketing.about.eyebrow")}
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
          {t("marketing.about.title")}
        </h1>
        <p className="mt-4 text-base leading-relaxed text-[var(--color-foreground-muted)]">
          {t("marketing.about.lead")}
        </p>

        <section className="mt-10 space-y-3">
          <h2 className="text-lg font-semibold tracking-tight">
            {t("marketing.about.whoTitle")}
          </h2>
          <p className="text-sm leading-relaxed text-[var(--color-foreground-muted)]">
            {t("marketing.about.whoBody")}
          </p>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="text-lg font-semibold tracking-tight">
            {t("marketing.about.whyTitle")}
          </h2>
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
                className="inline-flex items-center gap-1.5 font-medium text-[var(--color-brand-700)] hover:underline"
              >
                <Mail aria-hidden className="size-4" />
                {COMPANY.email}
              </a>
            </li>
            <li>
              <a
                href={`tel:${COMPANY.phoneTel}`}
                className="inline-flex items-center gap-1.5 font-medium text-[var(--color-brand-700)] hover:underline"
              >
                <Phone aria-hidden className="size-4" />
                {COMPANY.phoneDisplay}
              </a>
            </li>
          </ul>
          <div className="mt-6 flex flex-wrap gap-2">
            <Button asChild size="sm">
              <Link href="/demo">{t("marketing.header.bookDemo")}</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href="/impresum">{t("marketing.nav.imprint")}</Link>
            </Button>
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
