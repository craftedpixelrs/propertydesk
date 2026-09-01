import type { Metadata } from "next";
import Image from "next/image";
import { type ReactNode } from "react";
import { ShieldCheck, Sparkles, TrendingUp } from "lucide-react";

import { LanguageSwitcher } from "@/components/app/language-switcher";
import { ThemeSwitcher } from "@/components/app/theme-switcher";
import { APP_NAME, AUTH_IMAGES, LANDING_IMAGES } from "@/lib/constants/app";
import { t, type Locale } from "@/lib/i18n";
import { resolveRequestLocale } from "@/lib/i18n/resolve-locale";

/**
 * Auth layout — split-screen shell used by every unauthenticated page
 * (sign-in, forgot / reset password, accept invitation, verify email).
 *
 * On `lg+` viewports the left column is a branded hero: product photo,
 * light overlay, logo, tagline, and a short list of value props. The
 * right column hosts the centered form card. Below `lg` the hero
 * collapses to a compact top logo strip so the form remains reachable
 * without scrolling.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

export default async function AuthLayout({ children }: { children: ReactNode }) {
  const locale = await resolveRequestLocale();

  return (
    <main className="grid min-h-dvh grid-cols-1 bg-[var(--color-surface-muted)] lg:grid-cols-2">
      <BrandingPanel locale={locale} />

      <section className="flex min-h-dvh flex-col justify-center overflow-y-auto px-4 py-10 sm:px-6 safe-top safe-bottom">
        <div className="mx-auto w-full max-w-lg">
          <div className="mb-6 flex items-center justify-center lg:hidden">
            <BrandLockup size="md" />
          </div>

          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm sm:p-8">
            {children}
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
            <LanguageSwitcher />
            <ThemeSwitcher />
          </div>

          <p className="mt-4 text-center text-xs text-[var(--color-foreground-subtle)]">
            © {new Date().getFullYear()} {APP_NAME}. {t("common.appTagline", undefined, locale)}.
          </p>
        </div>
      </section>
    </main>
  );
}

function BrandLockup({ size }: { size: "md" | "lg" }) {
  const markClass = size === "lg" ? "h-14 w-14" : "h-11 w-11";
  const nameClass = size === "lg" ? "text-2xl" : "text-xl";

  return (
    <span className="flex items-center gap-3">
      <Image
        src={LANDING_IMAGES.logo.src}
        alt=""
        width={LANDING_IMAGES.logo.width}
        height={LANDING_IMAGES.logo.height}
        priority
        className={`${markClass} object-contain`}
      />
      <span className={`${nameClass} font-semibold tracking-tight text-[var(--color-brand-900)]`}>
        {APP_NAME}
      </span>
    </span>
  );
}

function BrandingPanel({ locale }: { locale: Locale }) {
  const features: Array<{ icon: typeof ShieldCheck; label: string }> = [
    { icon: TrendingUp, label: t("auth.brandingFeature1", undefined, locale) },
    { icon: ShieldCheck, label: t("auth.brandingFeature2", undefined, locale) },
    { icon: Sparkles, label: t("auth.brandingFeature3", undefined, locale) },
  ];

  return (
    <aside aria-hidden className="relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-between">
      <Image
        src={AUTH_IMAGES.hero.src}
        alt=""
        fill
        priority
        sizes="50vw"
        className="object-cover object-center"
      />
      <div
        className="absolute inset-0 bg-gradient-to-t from-[var(--color-surface)] via-[color-mix(in_oklab,var(--color-surface)_80%,transparent)] to-[color-mix(in_oklab,var(--color-surface)_55%,transparent)]"
        aria-hidden
      />

      <div className="relative z-10 p-10">
        <BrandLockup size="lg" />
      </div>

      <div className="relative z-10 px-10 pb-10">
        <h2 className="max-w-md text-3xl font-semibold leading-tight tracking-tight text-[var(--color-brand-900)]">
          {t("auth.brandingTitle", undefined, locale)}
        </h2>
        <p className="mt-3 max-w-md text-sm text-[var(--color-foreground-muted)]">
          {t("auth.brandingSubtitle", undefined, locale)}
        </p>

        <ul className="mt-8 space-y-3 text-sm text-[var(--color-foreground)]">
          {features.map(({ icon: Icon, label }) => (
            <li key={label} className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-md bg-[var(--color-brand-600)]/10 text-[var(--color-brand-700)]">
                <Icon className="size-3.5" />
              </span>
              <span>{label}</span>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
