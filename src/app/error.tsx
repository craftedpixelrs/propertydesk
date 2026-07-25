"use client";

import { useEffect } from "react";
import Link from "next/link";

/**
 * Route-level error boundary. Rendered whenever a segment throws during
 * server or client rendering. Shows a friendly Serbian message + a "try
 * again" affordance backed by Next's `reset()`.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
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
          Došlo je do greške
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-[var(--color-foreground)]">
          Nešto nije prošlo kako treba
        </h1>
        <p className="mt-3 text-sm text-[var(--color-foreground-muted)]">
          Pokušajte ponovo, a ako se problem ponavlja, kontaktirajte podršku sa oznakom{" "}
          <code className="rounded bg-[var(--color-surface-inset)] px-1.5 py-0.5 text-xs">
            {error.digest ?? "N/A"}
          </code>
          .
        </p>
        <div className="mt-6 flex items-center justify-center gap-2 text-sm">
          <button
            type="button"
            onClick={() => reset()}
            className="rounded-md bg-[var(--color-brand-500)] px-4 py-2 font-medium text-white hover:bg-[var(--color-brand-600)]"
          >
            Pokušaj ponovo
          </button>
          <Link
            href="/dashboard"
            className="rounded-md border border-[var(--color-border)] px-4 py-2 font-medium text-[var(--color-foreground)] hover:bg-[var(--color-surface-inset)]"
          >
            Kontrolna tabla
          </Link>
        </div>
      </div>
    </main>
  );
}
