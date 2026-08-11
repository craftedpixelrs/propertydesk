import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import Link from "next/link";

import { loadUserContext } from "@/server/auth/context";
import { PageHeader } from "@/components/app/page-header";

/**
 * Tenant-side settings layout. Requires an active organization.
 * Sub-routes: profile (organizacija), members (korisnici), subscription (pretplata).
 */
export default async function SettingsLayout({ children }: { children: ReactNode }) {
  const ctx = await loadUserContext();
  if (!ctx) redirect("/sign-in");
  if (!ctx.activeOrganization) {
    // Tenant settings need an active org. SUPER_ADMIN operating outside a
    // tenant context belongs on the platform console; everyone else falls
    // back to the standard empty dashboard.
    if (ctx.isSuperAdmin) redirect("/administracija");
    redirect("/dashboard");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Podešavanja"
        description={`Organizacija: ${ctx.activeOrganization.name}`}
      />
      <nav
        className="flex flex-wrap gap-2 border-b border-[var(--color-border)] pb-3"
        aria-label="Sekcije podešavanja"
      >
        <Link
          className="rounded-md border border-[var(--color-border)] px-3 py-1.5 text-sm hover:bg-[var(--color-surface-inset)]"
          href="/podesavanja/organizacija"
        >
          Organizacija
        </Link>
        <Link
          className="rounded-md border border-[var(--color-border)] px-3 py-1.5 text-sm hover:bg-[var(--color-surface-inset)]"
          href="/podesavanja/korisnici"
        >
          Korisnici
        </Link>
        <Link
          className="rounded-md border border-[var(--color-border)] px-3 py-1.5 text-sm hover:bg-[var(--color-surface-inset)]"
          href="/podesavanja/pretplata"
        >
          Pretplata
        </Link>
        <Link
          className="rounded-md border border-[var(--color-border)] px-3 py-1.5 text-sm hover:bg-[var(--color-surface-inset)]"
          href="/podesavanja/fakture"
        >
          Fakture
        </Link>
        <Link
          className="rounded-md border border-[var(--color-border)] px-3 py-1.5 text-sm hover:bg-[var(--color-surface-inset)]"
          href="/podesavanja/planovi-placanja"
        >
          Planovi plaćanja
        </Link>
      </nav>
      {children}
    </div>
  );
}
