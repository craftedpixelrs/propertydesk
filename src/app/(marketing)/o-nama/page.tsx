import type { Metadata } from "next";
import Link from "next/link";
import { Phone } from "lucide-react";

import { marketingCta } from "@/features/marketing/marketing-cta";
import { COMPANY } from "@/lib/constants/app";
import { EmailLink, MAIL_ICON_HTML } from "@/features/marketing/email-link";
import { buildLandingMetadata, LandingJsonLd } from "@/features/marketing/landing/landing-shell";
import { Index, PageIntro } from "@/features/marketing/ui";
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
      <article>
        <PageIntro
          trail={[
            { label: t("marketing.landing.home"), href: "/" },
            { label: t("marketing.about.eyebrow") },
          ]}
          title={t("marketing.about.title")}
          lead={t("marketing.about.lead")}
        />

        <div className="bg-white">
          <div className="container-app grid gap-12 py-14 sm:py-20 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-16">
            <div className="border-line border-t">
              <section className="border-line grid gap-x-6 gap-y-2 border-b py-9 sm:grid-cols-[2.5rem_minmax(0,1fr)]">
                <Index n={1} className="pt-1.5" />
                <div>
                  <h2 className="text-ink text-2xl leading-snug font-bold tracking-[-0.03em]">
                    {t("marketing.about.whoTitle")}
                  </h2>
                  <p className="text-mute mt-3 text-base leading-relaxed">
                    {t("marketing.about.whoBody")}
                  </p>
                </div>
              </section>
              <section className="border-line grid gap-x-6 gap-y-2 border-b py-9 sm:grid-cols-[2.5rem_minmax(0,1fr)]">
                <Index n={2} className="pt-1.5" />
                <div>
                  <h2 className="text-ink text-2xl leading-snug font-bold tracking-[-0.03em]">
                    {t("marketing.about.whyTitle")}
                  </h2>
                  <p className="text-mute mt-3 text-base leading-relaxed">
                    {t("marketing.about.whyBody")}
                  </p>
                </div>
              </section>
            </div>

            <section className="bg-ink relative self-start overflow-hidden rounded-3xl p-7 text-white sm:p-9 lg:sticky lg:top-28">
              <div
                aria-hidden
                className="pd-grid pd-grid-dark pointer-events-none absolute inset-0"
              />
              <div className="relative">
                <h2 className="text-2xl leading-snug font-bold tracking-[-0.03em] text-white">
                  {t("marketing.about.contactTitle")}
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-white/70">
                  {t("marketing.about.contactBody")}
                </p>
                <ul className="mt-6 divide-y divide-white/10 border-y border-white/10 text-sm">
                  <li className="py-3.5">
                    <EmailLink
                      email={COMPANY.email}
                      className="hover:text-tide-300 inline-flex items-center font-semibold text-white transition-colors"
                      iconHtml={MAIL_ICON_HTML}
                    />
                  </li>
                  <li className="py-3.5">
                    <a
                      href={`tel:${COMPANY.phoneTel}`}
                      className="hover:text-tide-300 inline-flex items-center gap-1.5 font-semibold text-white transition-colors"
                    >
                      <Phone aria-hidden className="size-4" />
                      {COMPANY.phoneDisplay}
                    </a>
                  </li>
                </ul>
                <div className="mt-7 flex flex-wrap gap-2.5">
                  <Link href="/demo" className={marketingCta("accent", "md")}>
                    {t("marketing.header.bookDemo")}
                  </Link>
                  <Link href="/impresum" className={marketingCta("outlineDark", "md")}>
                    {t("marketing.nav.imprint")}
                  </Link>
                </div>
              </div>
            </section>
          </div>
        </div>
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
