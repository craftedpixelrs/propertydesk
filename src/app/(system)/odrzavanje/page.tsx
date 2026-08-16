import type { Metadata } from "next";

import { APP_NAME } from "@/lib/constants/app";
import { createT } from "@/lib/i18n";
import { resolveRequestLocale } from "@/lib/i18n/resolve-locale";

export async function generateMetadata(): Promise<Metadata> {
  const t = createT(await resolveRequestLocale());
  return { title: t("pages.maintenanceTitle") };
}

/**
 * Static maintenance page. When we need to take the app offline for a
 * planned window we can rewrite ALL routes to this page in a reverse
 * proxy (nginx `try_files` / Vercel middleware) without redeploying.
 *
 * Kept purely presentational so it renders even when the DB / auth
 * providers are unavailable. Locale comes from the cookie first when
 * the session lookup fails.
 */
export default async function MaintenancePage() {
  const t = createT(await resolveRequestLocale());

  return (
    <main
      role="main"
      className="flex min-h-screen items-center justify-center bg-[var(--color-surface)] p-6"
    >
      <div className="max-w-md text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--color-brand-700)]">
          {t("pages.maintenanceTitle")}
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-[var(--color-foreground)]">
          {t("pages.maintenanceTitle")}
        </h1>
        <p className="mt-3 text-sm text-[var(--color-foreground-muted)]">
          {t("pages.maintenanceBody")}
        </p>
        <p className="mt-8 text-xs text-[var(--color-foreground-subtle)]">{APP_NAME}</p>
      </div>
    </main>
  );
}
