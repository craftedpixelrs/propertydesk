import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import Link from "next/link";

import { getSession, isSuperAdmin } from "@/server/auth/session";
import { PageHeader } from "@/components/app/page-header";

/**
 * Platform administration layout. Restricted to SUPER_ADMIN users only.
 * Sub-routes: /administracija, /organizacije, /planovi, /revizija.
 */
export default async function PlatformAdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  if (!isSuperAdmin(session)) redirect("/dashboard");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Administracija platforme"
        description="Upravljanje organizacijama, planovima i sistemskim revizijama."
      />
      <nav
        className="flex flex-wrap gap-2 border-b border-[var(--color-border)] pb-3"
        aria-label="Sekcije administracije"
      >
        <Link
          className="rounded-md border border-[var(--color-border)] px-3 py-1.5 text-sm hover:bg-[var(--color-surface-inset)]"
          href="/administracija"
        >
          Pregled
        </Link>
        <Link
          className="rounded-md border border-[var(--color-border)] px-3 py-1.5 text-sm hover:bg-[var(--color-surface-inset)]"
          href="/administracija/organizacije"
        >
          Organizacije
        </Link>
        <Link
          className="rounded-md border border-[var(--color-border)] px-3 py-1.5 text-sm hover:bg-[var(--color-surface-inset)]"
          href="/administracija/korisnici"
        >
          Korisnici
        </Link>
        <Link
          className="rounded-md border border-[var(--color-border)] px-3 py-1.5 text-sm hover:bg-[var(--color-surface-inset)]"
          href="/administracija/planovi"
        >
          Planovi
        </Link>
        <Link
          className="rounded-md border border-[var(--color-border)] px-3 py-1.5 text-sm hover:bg-[var(--color-surface-inset)]"
          href="/administracija/role"
        >
          Role i dozvole
        </Link>
        <Link
          className="rounded-md border border-[var(--color-border)] px-3 py-1.5 text-sm hover:bg-[var(--color-surface-inset)]"
          href="/administracija/naplata"
        >
          Naplata
        </Link>
        <Link
          className="rounded-md border border-[var(--color-border)] px-3 py-1.5 text-sm hover:bg-[var(--color-surface-inset)]"
          href="/administracija/revizija"
        >
          Revizija
        </Link>
      </nav>
      {children}
    </div>
  );
}
