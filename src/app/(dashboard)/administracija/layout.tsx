import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import Link from "next/link";

import { getSession, isSuperAdmin } from "@/server/auth/session";
import { getPropertyDeskTeamMember } from "@/server/permissions/property-desk";
import { PageHeader } from "@/components/app/page-header";

/**
 * Platform administration layout. Two audiences share this shell:
 *
 * 1. SUPER_ADMIN — sees every platform section (organizations, plans, roles,
 *    billing, monitoring) plus a Property Desk tab. The sidebar does not
 *    duplicate that tab: platform admins enter through „Administracija“.
 * 2. Property Desk internal team member (`property_desk_team_member.enabled`)
 *    — sidebar „Property Desk“ is their entry; this layout shows only
 *    Leadovi / Tim sub-links. Individual SUPER_ADMIN sections remain gated
 *    by their own `requireSuperAdmin()` calls inside the page.
 *
 * Everyone else is bounced back to `/dashboard`.
 */
export default async function PlatformAdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/sign-in");

  const superAdmin = isSuperAdmin(session);
  let pdTeamMember = null;
  if (!superAdmin) {
    pdTeamMember = await getPropertyDeskTeamMember(session.user.id).catch(
      () => null,
    );
    if (!pdTeamMember || !pdTeamMember.enabled) {
      redirect("/dashboard");
    }
  }

  const canSeePlatformSections = superAdmin;

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          superAdmin
            ? "Administracija platforme"
            : "Property Desk — operativni panel"
        }
        description={
          superAdmin
            ? "Upravljanje organizacijama, planovima i sistemskim revizijama."
            : "Marketing lead pipeline i interni Property Desk tim."
        }
      />
      {canSeePlatformSections ? (
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
            title="Sloj A — Platforma (SUPER_ADMIN) i Sloj B — Aplikacione uloge u organizaciji"
          >
            Uloge i dozvole (aplikacija i platforma)
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
          <Link
            className="rounded-md border border-[var(--color-border)] px-3 py-1.5 text-sm hover:bg-[var(--color-surface-inset)]"
            href="/administracija/monitoring"
          >
            Monitoring
          </Link>
          <Link
            className="rounded-md border border-[var(--color-border)] px-3 py-1.5 text-sm font-medium text-[var(--color-brand)] hover:bg-[var(--color-surface-inset)]"
            href="/administracija/property-desk"
            title="Property Desk operativni tim: marketing pipeline, tim i lead-ovi za SaaS."
          >
            Property Desk (tim)
          </Link>
        </nav>
      ) : (
        <nav
          className="flex flex-wrap gap-2 border-b border-[var(--color-border)] pb-3"
          aria-label="Property Desk sekcije"
        >
          <Link
            className="rounded-md border border-[var(--color-border)] px-3 py-1.5 text-sm hover:bg-[var(--color-surface-inset)]"
            href="/administracija/property-desk/leadovi"
          >
            Leadovi
          </Link>
          <Link
            className="rounded-md border border-[var(--color-border)] px-3 py-1.5 text-sm hover:bg-[var(--color-surface-inset)]"
            href="/administracija/property-desk/tim"
          >
            Tim
          </Link>
        </nav>
      )}
      {children}
    </div>
  );
}
