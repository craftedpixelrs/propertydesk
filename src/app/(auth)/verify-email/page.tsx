import type { Metadata } from "next";
import Link from "next/link";
import { t } from "@/lib/i18n";
import { resolveRequestLocale } from "@/lib/i18n/resolve-locale";
import { Alert, AlertDescription } from "@/components/ui/alert";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await resolveRequestLocale();
  return { title: t("auth.verifyEmailTitle", undefined, locale) };
}

export default async function VerifyEmailPage() {
  const locale = await resolveRequestLocale();

  return (
    <div>
      <h1 className="text-xl font-semibold text-[var(--color-foreground)]">
        {t("auth.verifyEmailTitle", undefined, locale)}
      </h1>
      <p className="text-sm text-[var(--color-foreground-muted)] mt-1">
        {t("auth.verifyEmailSubtitle", undefined, locale)}
      </p>
      <div className="mt-5">
        <Alert tone="info">
          <AlertDescription>{t("auth.verifyEmailSubtitle", undefined, locale)}</AlertDescription>
        </Alert>
      </div>
      <div className="mt-4 text-sm">
        <Link href="/sign-in" className="text-[var(--color-brand-700)] hover:underline">
          {t("common.back", undefined, locale)}
        </Link>
      </div>
    </div>
  );
}
