import Link from "next/link";
import { APP_NAME } from "@/lib/constants/app";

export const metadata = { title: "Pristup zabranjen" };

/**
 * Global 403. Rendered when a server component calls `forbidden()`.
 * Distinct from 404 so users understand the resource exists but they
 * don't have access to it — a helpful signal without leaking metadata.
 */
export default function Forbidden() {
  return (
    <main
      role="main"
      className="flex min-h-screen items-center justify-center bg-[var(--color-surface)] p-6"
    >
      <div className="max-w-md text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-red-600">
          Greška 403
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-[var(--color-foreground)]">
          Pristup zabranjen
        </h1>
        <p className="mt-3 text-sm text-[var(--color-foreground-muted)]">
          Nemate potrebne dozvole za pregled ovog sadržaja. Kontaktirajte administratora
          vaše organizacije ako smatrate da je ovo greška.
        </p>
        <div className="mt-6 flex items-center justify-center gap-2 text-sm">
          <Link
            href="/dashboard"
            className="rounded-md bg-[var(--color-brand-500)] px-4 py-2 font-medium text-white hover:bg-[var(--color-brand-600)]"
          >
            Kontrolna tabla
          </Link>
        </div>
        <p className="mt-8 text-xs text-[var(--color-foreground-subtle)]">{APP_NAME}</p>
      </div>
    </main>
  );
}
