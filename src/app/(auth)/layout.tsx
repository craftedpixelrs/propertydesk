import { type ReactNode } from "react";
import { APP_NAME } from "@/lib/constants/app";
import { t } from "@/lib/i18n";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-dvh bg-[var(--color-surface-muted)]">
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-4 py-10 sm:px-6 safe-top safe-bottom">
        <div className="mb-6 text-center">
          <div className="text-lg font-semibold text-[var(--color-foreground)]">{APP_NAME}</div>
          <div className="text-sm text-[var(--color-foreground-muted)]">
            {t("common.appTagline")}
          </div>
        </div>
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-6">
          {children}
        </div>
      </div>
    </main>
  );
}
