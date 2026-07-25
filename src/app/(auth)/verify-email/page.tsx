import type { Metadata } from "next";
import Link from "next/link";
import { t } from "@/lib/i18n";
import { Alert, AlertDescription } from "@/components/ui/alert";

export const metadata: Metadata = { title: t("auth.verifyEmailTitle") };

export default function VerifyEmailPage() {
  return (
    <div>
      <h1 className="text-xl font-semibold text-[var(--color-foreground)]">
        {t("auth.verifyEmailTitle")}
      </h1>
      <p className="text-sm text-[var(--color-foreground-muted)] mt-1">
        {t("auth.verifyEmailSubtitle")}
      </p>
      <div className="mt-5">
        <Alert tone="info">
          <AlertDescription>{t("auth.verifyEmailSubtitle")}</AlertDescription>
        </Alert>
      </div>
      <div className="mt-4 text-sm">
        <Link href="/sign-in" className="text-[var(--color-brand-700)] hover:underline">
          {t("common.back")}
        </Link>
      </div>
    </div>
  );
}
