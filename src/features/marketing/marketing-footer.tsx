import Image from "next/image";
import Link from "next/link";

import { APP_NAME, COMPANY, LANDING_IMAGES } from "@/lib/constants/app";
import { LANDING_ROUTES } from "@/features/marketing/landing/landing-shell";
import { CookieSettingsButton } from "@/features/marketing/cookie-banner";
import { createT } from "@/lib/i18n";
import { resolveRequestLocale } from "@/lib/i18n/resolve-locale";

const SOLUTION_LINKS = LANDING_ROUTES.filter(
  (r) => r.slug !== "demo" && r.slug !== "prodaja-novogradnje",
).slice(0, 6);

export async function MarketingFooter() {
  const t = createT(await resolveRequestLocale());
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-[var(--color-border)] bg-[var(--color-surface-muted)]">
      <div className="container-app grid gap-8 py-10 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 md:py-12">
        <div className="space-y-3">
          <div className="flex items-center gap-2 font-semibold tracking-tight">
            <Image
              src={LANDING_IMAGES.logo.src}
              alt=""
              width={LANDING_IMAGES.logo.width}
              height={LANDING_IMAGES.logo.height}
              className="h-8 w-8 object-contain"
            />
            <span className="text-base">{APP_NAME}</span>
          </div>
          <p className="max-w-xs text-sm leading-relaxed text-[var(--color-foreground-muted)]">
            {t("marketing.footer.blurb")}
          </p>
        </div>

        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-[var(--color-foreground-subtle)]">
            {t("marketing.nav.product")}
          </div>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <a
                href="/#mogucnosti"
                className="text-[var(--color-foreground-muted)] hover:text-[var(--color-foreground)]"
              >
                {t("marketing.nav.features")}
              </a>
            </li>
            <li>
              <a
                href="/#cenovnik"
                className="text-[var(--color-foreground-muted)] hover:text-[var(--color-foreground)]"
              >
                {t("marketing.nav.pricing")}
              </a>
            </li>
            <li>
              <a
                href="/#faq"
                className="text-[var(--color-foreground-muted)] hover:text-[var(--color-foreground)]"
              >
                {t("marketing.nav.faqLong")}
              </a>
            </li>
            <li>
              <Link
                href="/pomoc"
                className="text-[var(--color-foreground-muted)] hover:text-[var(--color-foreground)]"
              >
                {t("marketing.footer.help")}
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-[var(--color-foreground-subtle)]">
            {t("marketing.nav.solutions")}
          </div>
          <ul className="mt-3 space-y-2 text-sm">
            {SOLUTION_LINKS.map((r) => (
              <li key={r.slug}>
                <Link
                  href={`/${r.slug}`}
                  className="text-[var(--color-foreground-muted)] hover:text-[var(--color-foreground)]"
                >
                  {t(r.labelKey)}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-[var(--color-foreground-subtle)]">
            {t("marketing.nav.contact")}
          </div>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <Link
                href="/o-nama"
                className="text-[var(--color-foreground-muted)] hover:text-[var(--color-foreground)]"
              >
                {t("marketing.footer.about")}
              </Link>
            </li>
            <li>
              <a
                href={`mailto:${COMPANY.email}`}
                className="text-[var(--color-foreground-muted)] hover:text-[var(--color-foreground)]"
              >
                {COMPANY.email}
              </a>
            </li>
            <li>
              <a
                href={`tel:${COMPANY.phoneTel}`}
                className="text-[var(--color-foreground-muted)] hover:text-[var(--color-foreground)]"
              >
                {COMPANY.phoneDisplay}
              </a>
            </li>
            <li>
              <Link
                href="/demo"
                className="text-[var(--color-foreground-muted)] hover:text-[var(--color-foreground)]"
              >
                {t("marketing.footer.bookDemo")}
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-[var(--color-foreground-subtle)]">
            {t("marketing.nav.app")}
          </div>
          <ul className="mt-3 space-y-2 text-sm">
            <li className="flex items-center gap-2 text-[var(--color-foreground-muted)]">
              <span>{t("marketing.footer.signIn")}</span>
              <span className="rounded-full bg-[var(--color-surface-inset)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-foreground-subtle)]">
                {t("common.comingSoon")}
              </span>
            </li>
            <li className="text-xs text-[var(--color-foreground-subtle)]">
              {t("marketing.footer.launchDate")}
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-[var(--color-border)]">
        <div className="container-app flex flex-col items-start justify-between gap-3 py-4 text-xs text-[var(--color-foreground-subtle)] sm:flex-row sm:items-center">
          <div>
            © {year} {APP_NAME}. {t("marketing.footer.rights")}
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <Link
              href="/privatnost"
              className="text-[var(--color-foreground-muted)] hover:text-[var(--color-foreground)]"
            >
              {t("marketing.footer.privacy")}
            </Link>
            <Link
              href="/uslovi"
              className="text-[var(--color-foreground-muted)] hover:text-[var(--color-foreground)]"
            >
              {t("marketing.footer.terms")}
            </Link>
            <Link
              href="/impresum"
              className="text-[var(--color-foreground-muted)] hover:text-[var(--color-foreground)]"
            >
              {t("marketing.footer.imprint")}
            </Link>
            <CookieSettingsButton />
            <span>{t("marketing.footer.madeFor")}</span>
            <a
              href={COMPANY.operatorUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[var(--color-foreground-muted)] transition-colors hover:text-[var(--color-foreground)]"
              aria-label={t("marketing.footer.poweredByAria")}
            >
              <span>{t("marketing.footer.poweredBy")}</span>
              <Image
                src="/images/landing/craftedpixel.svg"
                alt="CraftedPixel"
                width={162}
                height={33}
                className="h-4 w-auto"
              />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
