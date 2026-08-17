import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
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
    slug: "pomoc",
    title: t("marketing.help.metaTitle"),
    description: t("marketing.help.metaDescription"),
    locale,
  });
}

export default async function HelpPage() {
  const locale = await resolveRequestLocale();
  const t = createT(locale);

  const works = [1, 2, 3, 4, 5, 6].map((n) =>
    t(`marketing.help.works${n}` as `marketing.help.works1`),
  );
  const later = [1, 2, 3, 4].map((n) =>
    t(`marketing.help.later${n}` as `marketing.help.later1`),
  );

  return (
    <>
      <article className="container-app max-w-3xl py-14 sm:py-16">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-brand-700)]">
          {t("marketing.help.eyebrow")}
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
          {t("marketing.help.title")}
        </h1>
        <p className="mt-4 text-base leading-relaxed text-[var(--color-foreground-muted)]">
          {t("marketing.help.lead")}
        </p>

        <section className="mt-10">
          <h2 className="text-lg font-semibold tracking-tight">
            {t("marketing.help.worksTitle")}
          </h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-[var(--color-foreground-muted)]">
            {works.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section className="mt-8">
          <h2 className="text-lg font-semibold tracking-tight">
            {t("marketing.help.laterTitle")}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-[var(--color-foreground-muted)]">
            {t("marketing.help.laterIntro")}
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-[var(--color-foreground-muted)]">
            {later.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section className="mt-8 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-6">
          <h2 className="text-lg font-semibold tracking-tight">
            {t("marketing.help.guideTitle")}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-[var(--color-foreground-muted)]">
            {t("marketing.help.guideBody")}
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button asChild size="sm">
              <a href="/help-center.html">{t("marketing.help.guideCta")}</a>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href="/demo">{t("marketing.header.bookDemo")}</Link>
            </Button>
          </div>
        </section>
      </article>
      <LandingJsonLd
        slug="pomoc"
        title={t("marketing.help.metaTitle")}
        description={t("marketing.help.metaDescription")}
        locale={locale}
        breadcrumb={t("marketing.nav.help")}
      />
    </>
  );
}
