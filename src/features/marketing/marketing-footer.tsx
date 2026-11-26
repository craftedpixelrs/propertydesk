import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { CITIES } from "@/features/marketing/cities/cities";
import { APP_NAME, COMPANY, DEMO_APP_URL, LANDING_IMAGES, MY_APP_URL } from "@/lib/constants/app";
import { EmailLink } from "@/features/marketing/email-link";
import { LANDING_ROUTES } from "@/features/marketing/landing/landing-shell";
import { CookieSettingsButton } from "@/features/marketing/cookie-banner";
import { marketingCta } from "@/features/marketing/marketing-cta";
import { createT } from "@/lib/i18n";
import { resolveRequestLocale } from "@/lib/i18n/resolve-locale";

// Everything except the demo CTA (lives in the header) and the "new
// build sales" alias (its topic is already covered by the per-persona
// pages). `za-upravnike` was added for Faza 11 — all remaining routes
// fit the footer column, so we no longer trim the list.
const SOLUTION_LINKS = LANDING_ROUTES.filter(
  (r) => r.slug !== "demo" && r.slug !== "prodaja-novogradnje",
);

/**
 * Footer "Gradovi" column. We cap at 6 entries so the column visually
 * matches the others; the full list lives on the hub page.
 */
const FOOTER_CITIES = CITIES.slice(0, 6);
const CITY_HUB_SLUG = "softver-za-prodaju-novogradnje";

const LINK = "text-white/60 transition-colors hover:text-white";
const HEAD = "font-mono text-[11px] font-medium tracking-[0.16em] text-tide-300 uppercase";

export async function MarketingFooter() {
  const t = createT(await resolveRequestLocale());
  const year = new Date().getFullYear();
  return (
    <footer className="bg-ink-950 relative overflow-hidden text-white">
      <div
        aria-hidden
        className="pd-grid pd-grid-dark pd-fade-b pointer-events-none absolute inset-0"
      />

      <div className="container-app relative">
        <div className="flex flex-col gap-8 border-b border-white/10 py-12 lg:flex-row lg:items-end lg:justify-between lg:py-14">
          <div className="max-w-xl">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-[10px] bg-white p-1">
                <Image
                  src={LANDING_IMAGES.logo.src}
                  alt=""
                  width={LANDING_IMAGES.logo.width}
                  height={LANDING_IMAGES.logo.height}
                  className="size-full object-contain"
                />
              </span>
              <span className="text-xl font-bold tracking-[-0.03em]">{APP_NAME}</span>
            </div>
            <p className="mt-5 text-base leading-relaxed text-white/65">
              {t("marketing.footer.blurb")}
            </p>
          </div>
          <div className="flex flex-col gap-2.5 sm:flex-row">
            <Link href="/demo" className={marketingCta("accent", "md")}>
              {t("marketing.footer.bookDemo")}
              <ArrowRight aria-hidden className="size-4" />
            </Link>
            <a href={DEMO_APP_URL} className={marketingCta("outlineDark", "md")}>
              {t("marketing.header.openDemo")}
            </a>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-10 py-12 md:grid-cols-3 lg:grid-cols-5">
          <div>
            <div className={HEAD}>{t("marketing.nav.product")}</div>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li>
                <a href="/#mogucnosti" className={LINK}>
                  {t("marketing.nav.features")}
                </a>
              </li>
              <li>
                <a href="/#cenovnik" className={LINK}>
                  {t("marketing.nav.pricing")}
                </a>
              </li>
              <li>
                <a href="/#faq" className={LINK}>
                  {t("marketing.nav.faqLong")}
                </a>
              </li>
              <li>
                <Link href="/blog" className={LINK}>
                  {t("marketing.nav.blog")}
                </Link>
              </li>
              <li>
                <Link href="/pomoc" className={LINK}>
                  {t("marketing.footer.help")}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <div className={HEAD}>{t("marketing.nav.solutions")}</div>
            <ul className="mt-4 space-y-2.5 text-sm">
              {SOLUTION_LINKS.map((r) => (
                <li key={r.slug}>
                  <Link href={`/${r.slug}`} className={LINK}>
                    {t(r.labelKey)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <div className={HEAD}>{t("marketing.nav.cities")}</div>
            <ul className="mt-4 space-y-2.5 text-sm">
              {FOOTER_CITIES.map((c) => (
                <li key={c.slug}>
                  <Link href={`/${CITY_HUB_SLUG}/${c.slug}`} className={LINK}>
                    {c.name}
                  </Link>
                </li>
              ))}
              <li>
                <Link href={`/${CITY_HUB_SLUG}`} className={LINK}>
                  {t("marketing.anchors.software")}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <div className={HEAD}>{t("marketing.nav.contact")}</div>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li>
                <Link href="/o-nama" className={LINK}>
                  {t("marketing.footer.about")}
                </Link>
              </li>
              <li>
                <EmailLink email={COMPANY.email} className={LINK} />
              </li>
              <li>
                <a href={`tel:${COMPANY.phoneTel}`} className={LINK}>
                  {COMPANY.phoneDisplay}
                </a>
              </li>
              <li>
                <a href={DEMO_APP_URL} className={LINK}>
                  {t("marketing.header.openDemo")}
                </a>
              </li>
              <li>
                <Link href="/demo" className={LINK}>
                  {t("marketing.footer.bookDemo")}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <div className={HEAD}>{t("marketing.nav.app")}</div>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li>
                <a href={`${MY_APP_URL}/sign-in`} className={LINK}>
                  {t("marketing.footer.signIn")}
                </a>
              </li>
              <li>
                <a href={DEMO_APP_URL} className={LINK}>
                  {t("marketing.header.openDemo")}
                </a>
              </li>
            </ul>
            <div className={`${HEAD} mt-8`}>{t("marketing.footer.legal")}</div>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li>
                <Link href="/privatnost" className={LINK}>
                  {t("marketing.footer.privacy")}
                </Link>
              </li>
              <li>
                <Link href="/uslovi" className={LINK}>
                  {t("marketing.footer.terms")}
                </Link>
              </li>
              <li>
                <Link href="/impresum" className={LINK}>
                  {t("marketing.footer.imprint")}
                </Link>
              </li>
              <li>
                <CookieSettingsButton />
              </li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col items-start justify-between gap-3 border-t border-white/10 py-6 text-xs text-white/45 md:flex-row md:items-center">
          <div>
            © {year} {APP_NAME}. {t("marketing.footer.rights")}
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <span className="font-mono tracking-wide">{t("marketing.footer.madeFor")}</span>
            <a
              href={COMPANY.operatorUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-white/60 transition-colors hover:text-white"
              aria-label={t("marketing.footer.poweredByAria")}
            >
              <span>{t("marketing.footer.poweredBy")}</span>
              <Image
                src="/images/landing/craftedpixel.svg"
                alt="CraftedPixel"
                width={162}
                height={33}
                className="h-4 w-auto brightness-0 invert"
              />
            </a>
          </div>
        </div>
      </div>

      <div
        aria-hidden
        className="pointer-events-none relative -mb-[0.16em] text-center text-[clamp(3rem,14.5vw,13.5rem)] leading-[0.8] font-bold tracking-[-0.06em] whitespace-nowrap text-white/[0.035] select-none"
      >
        {APP_NAME}
      </div>
    </footer>
  );
}
