import type { Metadata } from "next";
import Link from "next/link";
import { Check } from "lucide-react";

import { marketingCta } from "@/features/marketing/marketing-cta";
import { buildLandingMetadata, LandingJsonLd } from "@/features/marketing/landing/landing-shell";
import { PageIntro } from "@/features/marketing/ui";
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
  const later = [1, 2, 3, 4].map((n) => t(`marketing.help.later${n}` as `marketing.help.later1`));

  return (
    <>
      <article>
        <PageIntro
          trail={[
            { label: t("marketing.landing.home"), href: "/" },
            { label: t("marketing.help.eyebrow") },
          ]}
          title={t("marketing.help.title")}
          lead={t("marketing.help.lead")}
        />

        <div className="bg-white">
          <div className="container-app py-14 sm:py-20">
            <div className="grid gap-4 lg:grid-cols-2">
              <section className="border-line rounded-3xl border bg-white p-7 sm:p-9">
                <h2 className="text-ink text-2xl leading-snug font-bold tracking-[-0.03em]">
                  {t("marketing.help.worksTitle")}
                </h2>
                <ul className="border-line mt-6 border-t">
                  {works.map((item) => (
                    <li
                      key={item}
                      className="border-line text-ink flex items-start gap-3 border-b py-3.5 text-[0.95rem] leading-relaxed"
                    >
                      <span
                        aria-hidden
                        className="bg-tide mt-0.5 grid size-5 flex-none place-items-center rounded-full text-white"
                      >
                        <Check className="size-3" strokeWidth={3.5} />
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
              </section>

              <section className="border-line pd-hatch rounded-3xl border border-dashed p-7 sm:p-9">
                <h2 className="text-ink text-2xl leading-snug font-bold tracking-[-0.03em]">
                  {t("marketing.help.laterTitle")}
                </h2>
                <p className="text-mute mt-3 text-sm leading-relaxed">
                  {t("marketing.help.laterIntro")}
                </p>
                <ul className="border-line mt-6 border-t">
                  {later.map((item) => (
                    <li
                      key={item}
                      className="border-line text-mute flex items-start gap-3 border-b py-3.5 text-[0.95rem] leading-relaxed"
                    >
                      <span
                        aria-hidden
                        className="border-faint mt-1 size-4 flex-none rounded-full border border-dashed"
                      />
                      {item}
                    </li>
                  ))}
                </ul>
              </section>
            </div>

            <section className="bg-ink relative mt-4 overflow-hidden rounded-3xl p-7 text-white sm:p-10 lg:flex lg:items-center lg:justify-between lg:gap-12">
              <div
                aria-hidden
                className="pd-grid pd-grid-dark pointer-events-none absolute inset-0"
              />
              <div className="relative max-w-2xl">
                <h2 className="text-2xl leading-snug font-bold tracking-[-0.03em] text-white">
                  {t("marketing.help.guideTitle")}
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-white/70 sm:text-base">
                  {t("marketing.help.guideBody")}
                </p>
              </div>
              <div className="relative mt-7 flex flex-none flex-wrap gap-2.5 lg:mt-0">
                <a href="/help-center.html" className={marketingCta("accent", "md")}>
                  {t("marketing.help.guideCta")}
                </a>
                <Link href="/demo" className={marketingCta("outlineDark", "md")}>
                  {t("marketing.header.bookDemo")}
                </Link>
              </div>
            </section>
          </div>
        </div>
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
