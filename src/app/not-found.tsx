import Link from "next/link";
import type { Metadata } from "next";

import { APP_NAME } from "@/lib/constants/app";
import { createT } from "@/lib/i18n";
import { resolveRequestLocale } from "@/lib/i18n/resolve-locale";

export async function generateMetadata(): Promise<Metadata> {
  const t = createT(await resolveRequestLocale());
  return { title: t("pages.notFoundTitle") };
}

/**
 * Global 404. Rendered whenever Next cannot resolve a route or a server
 * component calls `notFound()`. Locale-aware copy, no chrome, one CTA
 * back to the dashboard.
 */
export default async function NotFound() {
  const t = createT(await resolveRequestLocale());

  return (
    <main
      role="main"
      className="flex min-h-screen items-center justify-center bg-[var(--color-surface)] p-6"
    >
      <div className="max-w-md text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--color-brand-700)]">
          {t("pages.notFoundKicker")}
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-[var(--color-foreground)]">
          {t("pages.notFoundTitle")}
        </h1>
        <p className="mt-3 text-sm text-[var(--color-foreground-muted)]">
          {t("pages.notFoundBody")}
        </p>
        <div className="mt-6 flex items-center justify-center gap-2 text-sm">
          <Link
            href="/dashboard"
            className="rounded-md bg-[var(--color-brand-500)] px-4 py-2 font-medium text-white hover:bg-[var(--color-brand-600)]"
          >
            {t("nav.dashboard")}
          </Link>
          <Link
            href="/"
            className="rounded-md border border-[var(--color-border)] px-4 py-2 font-medium text-[var(--color-foreground)] hover:bg-[var(--color-surface-inset)]"
          >
            {t("nav.home")}
          </Link>
        </div>
        <p className="mt-8 text-xs text-[var(--color-foreground-subtle)]">{APP_NAME}</p>
      </div>
    </main>
  );
}
