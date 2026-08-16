import type { Metadata } from "next";
import Link from "next/link";

import { SignInForm } from "@/features/auth/sign-in-form";
import { t } from "@/lib/i18n";
import { resolveRequestLocale } from "@/lib/i18n/resolve-locale";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await resolveRequestLocale();
  return { title: t("auth.signInTitle", undefined, locale) };
}

export default async function SignInPage() {
  const locale = await resolveRequestLocale();

  return (
    <div>
      <div className="mb-6 space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-foreground)]">
          {t("auth.signInTitle", undefined, locale)}
        </h1>
        <p className="text-sm text-[var(--color-foreground-muted)]">
          {t("auth.signInSubtitle", undefined, locale)}
        </p>
      </div>

      <SignInForm />

      <div className="mt-6 flex items-center justify-between text-sm">
        <Link
          href="/forgot-password"
          className="font-medium text-[var(--color-brand-700)] hover:text-[var(--color-brand-800)] hover:underline"
        >
          {t("auth.forgotPassword", undefined, locale)}
        </Link>
        <span className="text-xs text-[var(--color-foreground-subtle)]">
          {t("auth.inviteOnly", undefined, locale)}
        </span>
      </div>
    </div>
  );
}
