import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

/**
 * Faza 11 — Resident portal shell.
 *
 * Separate route group from `(dashboard)` because residents are NOT
 * `User`s in the manager org — they authenticate through the signed
 * `pd_resident` cookie set by the magic-link accept page. No sidebar,
 * no app chrome, no tenant switcher. The individual pages render only
 * what the resident is authorized to see for their unit(s).
 */
export default function ResidentLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      <header className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Link href="/stanar" className="font-semibold text-[var(--color-brand-700)]">
            Portal za stanare
          </Link>
          <nav className="flex flex-wrap items-center gap-3 text-sm text-[var(--color-foreground-muted)]">
            <Link href="/stanar" className="hover:text-[var(--color-foreground)]">
              Pregled
            </Link>
            <Link href="/stanar/zaduzenja" className="hover:text-[var(--color-foreground)]">
              Zaduženja
            </Link>
            <Link href="/stanar/kvarovi/novi" className="hover:text-[var(--color-foreground)]">
              Prijavi kvar
            </Link>
            <Link href="/stanar/glasanje" className="hover:text-[var(--color-foreground)]">
              Glasanje
            </Link>
            <form action="/stanar/odjava" method="post" className="inline">
              <button
                type="submit"
                className="rounded-md border border-[var(--color-border)] px-2 py-1 text-xs hover:bg-[var(--color-surface-inset)]"
              >
                Odjava
              </button>
            </form>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
      <footer className="border-t border-[var(--color-border)] py-4 text-center text-xs text-[var(--color-foreground-muted)]">
        PropertyDesk · Portal za stanare
      </footer>
    </div>
  );
}
