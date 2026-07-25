import type { Metadata } from "next";
import Link from "next/link";
import { ForgotPasswordForm } from "@/features/auth/forgot-password-form";
import { t } from "@/lib/i18n";

export const metadata: Metadata = { title: t("auth.resetPasswordTitle") };

export default function ForgotPasswordPage() {
  return (
    <div>
      <h1 className="text-xl font-semibold text-[var(--color-foreground)]">
        {t("auth.resetPasswordTitle")}
      </h1>
      <p className="text-sm text-[var(--color-foreground-muted)] mt-1">
        {t("auth.resetPasswordSubtitle")}
      </p>
      <div className="mt-5">
        <ForgotPasswordForm />
      </div>
      <div className="mt-4 text-sm">
        <Link href="/sign-in" className="text-[var(--color-brand-700)] hover:underline">
          {t("common.back")}
        </Link>
      </div>
    </div>
  );
}
