import Image from "next/image";
import Link from "next/link";

import { CITIES } from "@/features/marketing/cities/cities";
import { APP_NAME, COMPANY, LANDING_IMAGES } from "@/lib/constants/app";
import { EmailLink } from "@/features/marketing/email-link";
import { LANDING_ROUTES } from "@/features/marketing/landing/landing-shell";
import { CookieSettingsButton } from "@/features/marketing/cookie-banner";
import { createT } from "@/lib/i18n";
import { resolveRequestLocale } from "@/lib/i18n/resolve-locale";

const SOLUTION_LINKS = LANDING_ROUTES.filter(
  (r) => r.slug !== "demo" && r.slug !== "prodaja-novogradnje",
).slice(0, 6);

/**
 * Footer "Gradovi" column. We cap at 6 entries so the column visually
 * matches the others; the full list lives on the hub page.
 */
const FOOTER_CITIES = CITIES.slice(0, 6);
const CITY_HUB_SLUG = "softver-za-prodaju-novogradnje";

export async function MarketingFooter() {
  const t = createT(await resolveRequestLocale());
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-white/10 bg-[#0b1020] text-[#f7f3ea]">
      <div className="container-app grid gap-8 py-10 sm:grid-cols-2 md:grid-cols-3 md:py-12 lg:grid-cols-6">
        <div className="space-y-3">
          <div className="flex items-center gap-2 font-semibold tracking-tight">
            <Image
              src={LANDING_IMAGES.logo.src}
              alt=""
              width={LANDING_IMAGES.logo.width}
              height={LANDING_IMAGES.logo.height}
              className="h-8 w-8 object-contain"
            />
            <span className="font-display text-lg font-semibold tracking-tight">{APP_NAME}</span>
          </div>
          <p className="max-w-xs text-sm leading-relaxed text-white/65">
            {t("marketing.footer.blurb")}
          </p>
        </div>

        <div>
          <div className="text-xs font-semibold tracking-wider text-white/45 uppercase">
            {t("marketing.nav.product")}
          </div>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <a href="/#mogucnosti" className="text-white/65 hover:text-white">
                {t("marketing.nav.features")}
              </a>
            </li>
            <li>
              <a href="/#cenovnik" className="text-white/65 hover:text-white">
                {t("marketing.nav.pricing")}
              </a>
            </li>
            <li>
              <a href="/#faq" className="text-white/65 hover:text-white">
                {t("marketing.nav.faqLong")}
              </a>
            </li>
            <li>
              <Link href="/blog" className="text-white/65 hover:text-white">
                {t("marketing.nav.blog")}
              </Link>
            </li>
            <li>
              <Link href="/pomoc" className="text-white/65 hover:text-white">
                {t("marketing.footer.help")}
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <div className="text-xs font-semibold tracking-wider text-white/45 uppercase">
            {t("marketing.nav.solutions")}
          </div>
          <ul className="mt-3 space-y-2 text-sm">
            {SOLUTION_LINKS.map((r) => (
              <li key={r.slug}>
                <Link href={`/${r.slug}`} className="text-white/65 hover:text-white">
                  {t(r.labelKey)}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <div className="text-xs font-semibold tracking-wider text-white/45 uppercase">
            {t("marketing.nav.cities")}
          </div>
          <ul className="mt-3 space-y-2 text-sm">
            {FOOTER_CITIES.map((c) => (
              <li key={c.slug}>
                <Link
                  href={`/${CITY_HUB_SLUG}/${c.slug}`}
                  className="text-white/65 hover:text-white"
                >
                  {c.name}
                </Link>
              </li>
            ))}
            <li>
              <Link href={`/${CITY_HUB_SLUG}`} className="text-white/65 hover:text-white">
                {t("marketing.anchors.software")}
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <div className="text-xs font-semibold tracking-wider text-white/45 uppercase">
            {t("marketing.nav.contact")}
          </div>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <Link href="/o-nama" className="text-white/65 hover:text-white">
                {t("marketing.footer.about")}
              </Link>
            </li>
            <li>
              <EmailLink email={COMPANY.email} className="text-white/65 hover:text-white" />
            </li>
            <li>
              <a href={`tel:${COMPANY.phoneTel}`} className="text-white/65 hover:text-white">
                {COMPANY.phoneDisplay}
              </a>
            </li>
            <li>
              <Link href="/demo" className="text-white/65 hover:text-white">
                {t("marketing.footer.bookDemo")}
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <div className="text-xs font-semibold tracking-wider text-white/45 uppercase">
            {t("marketing.nav.app")}
          </div>
          <ul className="mt-3 space-y-2 text-sm">
            <li className="flex items-center gap-2 text-white/65">
              <span>{t("marketing.footer.signIn")}</span>
              <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-[#f3e2bc] uppercase">
                {t("common.comingSoon")}
              </span>
            </li>
            <li className="text-xs text-white/45">{t("marketing.footer.launchDate")}</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container-app flex flex-col items-start justify-between gap-3 py-4 text-xs text-white/45 sm:flex-row sm:items-center">
          <div>
            © {year} {APP_NAME}. {t("marketing.footer.rights")}
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <Link href="/privatnost" className="text-white/65 hover:text-white">
              {t("marketing.footer.privacy")}
            </Link>
            <Link href="/uslovi" className="text-white/65 hover:text-white">
              {t("marketing.footer.terms")}
            </Link>
            <Link href="/impresum" className="text-white/65 hover:text-white">
              {t("marketing.footer.imprint")}
            </Link>
            <CookieSettingsButton />
            <span>{t("marketing.footer.madeFor")}</span>
            <a
              href={COMPANY.operatorUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-white/65 transition-colors hover:text-white"
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
    </footer>
  );
}
