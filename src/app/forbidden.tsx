import Link from "next/link";
import type { Metadata } from "next";

import { APP_NAME } from "@/lib/constants/app";
import { createT } from "@/lib/i18n";
import { resolveRequestLocale } from "@/lib/i18n/resolve-locale";

export async function generateMetadata(): Promise<Metadata> {
  const t = createT(await resolveRequestLocale());
  return { title: t("pages.forbiddenTitle") };
}

/**
 * Global 403. Rendered when a server component calls `forbidden()`.
 * Distinct from 404 so users understand the resource exists but they
 * don't have access to it — a helpful signal without leaking metadata.
 */
export default async function Forbidden() {
  const t = createT(await resolveRequestLocale());

  return (
    <main
      role="main"
      className="flex min-h-screen items-center justify-center bg-[var(--color-surface)] p-6"
    >
      <div className="max-w-md text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-red-600">
          {t("pages.forbiddenKicker")}
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-[var(--color-foreground)]">
          {t("pages.forbiddenTitle")}
        </h1>
        <p className="mt-3 text-sm text-[var(--color-foreground-muted)]">
          {t("pages.forbiddenBody")}
        </p>
        <div className="mt-6 flex items-center justify-center gap-2 text-sm">
          <Link
            href="/dashboard"
            className="rounded-md bg-[var(--color-brand-500)] px-4 py-2 font-medium text-white hover:bg-[var(--color-brand-600)]"
          >
            {t("nav.dashboard")}
          </Link>
        </div>
        <p className="mt-8 text-xs text-[var(--color-foreground-subtle)]">{APP_NAME}</p>
      </div>
    </main>
  );
}
