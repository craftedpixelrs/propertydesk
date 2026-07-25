import type { Metadata } from "next";
import Link from "next/link";
import { SignInForm } from "@/features/auth/sign-in-form";
import { t } from "@/lib/i18n";

export const metadata: Metadata = { title: t("auth.signInTitle") };

export default function SignInPage() {
  return (
    <div>
      <h1 className="text-xl font-semibold text-[var(--color-foreground)]">
        {t("auth.signInTitle")}
      </h1>
      <p className="text-sm text-[var(--color-foreground-muted)] mt-1">
        {t("auth.signInSubtitle")}
      </p>
      <div className="mt-5">
        <SignInForm />
      </div>
      <div className="mt-4 text-sm">
        <Link
          href="/forgot-password"
          className="text-[var(--color-brand-700)] hover:underline"
        >
          {t("auth.forgotPassword")}
        </Link>
      </div>
    </div>
  );
}
