import type { Metadata } from "next";
import Link from "next/link";

import { AgencySelfRegisterForm } from "@/features/auth/agency-self-register-form";
import { t } from "@/lib/i18n";
import { resolveRequestLocale } from "@/lib/i18n/resolve-locale";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await resolveRequestLocale();
  return { title: t("auth.agencyRegisterTitle", undefined, locale) };
}

export default async function AgencyRegisterPage() {
  const locale = await resolveRequestLocale();

  return (
    <div>
      <div className="mb-6 space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-foreground)]">
          {t("auth.agencyRegisterTitle", undefined, locale)}
        </h1>
        <p className="text-sm text-[var(--color-foreground-muted)]">
          {t("auth.agencyRegisterSubtitle", undefined, locale)}
        </p>
      </div>

      <AgencySelfRegisterForm />

      <p className="mt-6 text-center text-sm text-[var(--color-foreground-muted)]">
        {t("auth.agencyRegisterHaveAccount", undefined, locale)}{" "}
        <Link
          href="/sign-in"
          className="font-medium text-[var(--color-brand-700)] hover:underline"
        >
          {t("auth.signIn", undefined, locale)}
        </Link>
      </p>
    </div>
  );
}
