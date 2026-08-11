import type { Metadata } from "next";
import Link from "next/link";

import { SignInForm } from "@/features/auth/sign-in-form";
import { t } from "@/lib/i18n";

export const metadata: Metadata = { title: t("auth.signInTitle") };

export default function SignInPage() {
  return (
    <div>
      <div className="mb-6 space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-foreground)]">
          {t("auth.signInTitle")}
        </h1>
        <p className="text-sm text-[var(--color-foreground-muted)]">
          {t("auth.signInSubtitle")}
        </p>
      </div>

      <SignInForm />

      <div className="mt-6 flex items-center justify-between text-sm">
        <Link
          href="/forgot-password"
          className="font-medium text-[var(--color-brand-700)] hover:text-[var(--color-brand-800)] hover:underline"
        >
          {t("auth.forgotPassword")}
        </Link>
        <span className="text-xs text-[var(--color-foreground-subtle)]">
          Pristup po pozivu
        </span>
      </div>
    </div>
  );
}
