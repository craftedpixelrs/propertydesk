import { type ReactNode } from "react";
import { Building2, ShieldCheck, Sparkles, TrendingUp } from "lucide-react";

import { LanguageSwitcher } from "@/components/app/language-switcher";
import { APP_NAME } from "@/lib/constants/app";
import { t, type Locale } from "@/lib/i18n";
import { resolveRequestLocale } from "@/lib/i18n/resolve-locale";

/**
 * Auth layout — split-screen shell used by every unauthenticated page
 * (sign-in, forgot / reset password, accept invitation, verify email).
 *
 * On `lg+` viewports the left column is a branded hero with a gradient
 * background, product tagline, and a short list of value props. The
 * right column hosts the centered form card. Below `lg` the hero
 * collapses to a compact top logo strip so the form remains reachable
 * without scrolling.
 */
export default async function AuthLayout({ children }: { children: ReactNode }) {
  const locale = await resolveRequestLocale();

  return (
    <main className="grid min-h-dvh grid-cols-1 bg-[var(--color-surface-muted)] lg:grid-cols-2">
      <BrandingPanel locale={locale} />

      <section className="flex min-h-dvh flex-col justify-center px-4 py-10 sm:px-6 safe-top safe-bottom">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-6 flex items-center justify-center gap-2 lg:hidden">
            <span className="inline-flex size-9 items-center justify-center rounded-lg bg-[var(--color-brand-600)] text-white shadow-sm">
              <Building2 className="size-5" aria-hidden />
            </span>
            <span className="text-lg font-semibold text-[var(--color-foreground)]">
              {APP_NAME}
            </span>
          </div>

          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm sm:p-8">
            {children}
          </div>

          <div className="mt-6 flex justify-center">
            <LanguageSwitcher />
          </div>

          <p className="mt-4 text-center text-xs text-[var(--color-foreground-subtle)]">
            © {new Date().getFullYear()} {APP_NAME}. {t("common.appTagline", undefined, locale)}.
          </p>
        </div>
      </section>
    </main>
  );
}

function BrandingPanel({ locale }: { locale: Locale }) {
  const features: Array<{ icon: typeof ShieldCheck; label: string }> = [
    { icon: TrendingUp, label: t("auth.brandingFeature1", undefined, locale) },
    { icon: ShieldCheck, label: t("auth.brandingFeature2", undefined, locale) },
    { icon: Sparkles, label: t("auth.brandingFeature3", undefined, locale) },
  ];

  return (
    <aside
      aria-hidden
      className="relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-between"
      style={{
        backgroundImage:
          "radial-gradient(ellipse at top left, var(--color-brand-500) 0%, var(--color-brand-700) 45%, var(--color-brand-900) 100%)",
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "radial-gradient(circle at 80% 20%, rgba(255,255,255,0.35), transparent 40%), radial-gradient(circle at 20% 80%, rgba(255,255,255,0.2), transparent 45%)",
        }}
      />

      <div className="relative z-10 flex items-center gap-3 p-10 text-white">
        <span className="inline-flex size-10 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
          <Building2 className="size-6" />
        </span>
        <span className="text-xl font-semibold tracking-tight">{APP_NAME}</span>
      </div>

      <div className="relative z-10 px-10 pb-10 text-white">
        <h2 className="max-w-md text-3xl font-semibold leading-tight tracking-tight">
          {t("auth.brandingTitle", undefined, locale)}
        </h2>
        <p className="mt-3 max-w-md text-sm text-white/80">
          {t("auth.brandingSubtitle", undefined, locale)}
        </p>

        <ul className="mt-8 space-y-3 text-sm text-white/90">
          {features.map(({ icon: Icon, label }) => (
            <li key={label} className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-md bg-white/15">
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
