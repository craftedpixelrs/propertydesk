"use client";

import { useEffect } from "react";
import Link from "next/link";

import { useT } from "@/components/app/i18n-provider";

/**
 * Route-level error boundary. Rendered whenever a segment throws during
 * server or client rendering. Shows a friendly message + a "try
 * again" affordance backed by Next's `reset()`.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useT();

  useEffect(() => {
    // In production a monitoring integration (Sentry, Datadog, …) would
    // pick this up automatically via the console.
    if (process.env.NODE_ENV !== "production") {
      console.error("[route-error]", error);
    }
  }, [error]);

  return (
    <main
      role="main"
      className="flex min-h-[60vh] items-center justify-center p-6"
    >
      <div className="max-w-md text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-red-600">
          {t("pages.errorKicker")}
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-[var(--color-foreground)]">
          {t("pages.errorTitle")}
        </h1>
        <p className="mt-3 text-sm text-[var(--color-foreground-muted)]">
          {t("pages.errorBody", { digest: error.digest ?? "—" })}
        </p>
        <div className="mt-6 flex items-center justify-center gap-2 text-sm">
          <button
            type="button"
            onClick={() => reset()}
            className="rounded-md bg-[var(--color-brand-500)] px-4 py-2 font-medium text-white hover:bg-[var(--color-brand-600)]"
          >
            {t("common.retry")}
          </button>
          <Link
            href="/dashboard"
            className="rounded-md border border-[var(--color-border)] px-4 py-2 font-medium text-[var(--color-foreground)] hover:bg-[var(--color-surface-inset)]"
          >
            {t("nav.dashboard")}
          </Link>
        </div>
      </div>
    </main>
  );
}
