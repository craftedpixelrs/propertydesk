import type { Metadata } from "next";
import Link from "next/link";
import { ResetPasswordForm } from "@/features/auth/reset-password-form";
import { t } from "@/lib/i18n";

export const metadata: Metadata = { title: t("auth.newPasswordTitle") };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return (
    <div>
      <h1 className="text-xl font-semibold text-[var(--color-foreground)]">
        {t("auth.newPasswordTitle")}
      </h1>
      <div className="mt-5">
        <ResetPasswordForm token={token ?? ""} />
      </div>
      <div className="mt-4 text-sm">
        <Link href="/sign-in" className="text-[var(--color-brand-700)] hover:underline">
          {t("common.back")}
        </Link>
      </div>
    </div>
  );
}
