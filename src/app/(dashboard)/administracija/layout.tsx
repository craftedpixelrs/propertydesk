import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import Link from "next/link";

import { getSession, isSuperAdmin } from "@/server/auth/session";
import { getPropertyDeskTeamMember } from "@/server/permissions/property-desk";
import { PageHeader } from "@/components/app/page-header";
import { createT } from "@/lib/i18n";
import { resolveRequestLocale } from "@/lib/i18n/resolve-locale";

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
  const t = createT(await resolveRequestLocale());

  return (
    <div className="space-y-6">
      <PageHeader
        title={superAdmin ? t("admin.title") : t("admin.titlePd")}
        description={
          superAdmin ? t("admin.description") : t("admin.descriptionPd")
        }
      />
      {canSeePlatformSections ? (
        <nav
          className="flex flex-wrap gap-2 border-b border-[var(--color-border)] pb-3"
          aria-label={t("admin.navAria")}
        >
          <Link
            className="rounded-md border border-[var(--color-border)] px-3 py-1.5 text-sm hover:bg-[var(--color-surface-inset)]"
            href="/administracija"
          >
            {t("admin.overview")}
          </Link>
          <Link
            className="rounded-md border border-[var(--color-border)] px-3 py-1.5 text-sm hover:bg-[var(--color-surface-inset)]"
            href="/administracija/organizacije"
          >
            {t("admin.organizations")}
          </Link>
          <Link
            className="rounded-md border border-[var(--color-border)] px-3 py-1.5 text-sm hover:bg-[var(--color-surface-inset)]"
            href="/administracija/korisnici"
          >
            {t("admin.users")}
          </Link>
          <Link
            className="rounded-md border border-[var(--color-border)] px-3 py-1.5 text-sm hover:bg-[var(--color-surface-inset)]"
            href="/administracija/planovi"
          >
            {t("admin.plans")}
          </Link>
          <Link
            className="rounded-md border border-[var(--color-border)] px-3 py-1.5 text-sm hover:bg-[var(--color-surface-inset)]"
            href="/administracija/role"
            title={t("admin.rolesNavTitle")}
          >
            {t("admin.rolesNav")}
          </Link>
          <Link
            className="rounded-md border border-[var(--color-border)] px-3 py-1.5 text-sm hover:bg-[var(--color-surface-inset)]"
            href="/administracija/naplata"
          >
            {t("billing.title")}
          </Link>
          <Link
            className="rounded-md border border-[var(--color-border)] px-3 py-1.5 text-sm hover:bg-[var(--color-surface-inset)]"
            href="/administracija/revizija"
          >
            {t("admin.audit")}
          </Link>
          <Link
            className="rounded-md border border-[var(--color-border)] px-3 py-1.5 text-sm hover:bg-[var(--color-surface-inset)]"
            href="/administracija/monitoring"
          >
            {t("admin.monitoring")}
          </Link>
          <Link
            className="rounded-md border border-[var(--color-border)] px-3 py-1.5 text-sm font-medium text-[var(--color-brand)] hover:bg-[var(--color-surface-inset)]"
            href="/administracija/property-desk"
            title={t("admin.propertyDeskTeamTitle")}
          >
            {t("admin.propertyDeskTeam")}
          </Link>
        </nav>
      ) : (
        <nav
          className="flex flex-wrap gap-2 border-b border-[var(--color-border)] pb-3"
          aria-label={t("admin.navPdAria")}
        >
          <Link
            className="rounded-md border border-[var(--color-border)] px-3 py-1.5 text-sm hover:bg-[var(--color-surface-inset)]"
            href="/administracija/property-desk/leadovi"
          >
            {t("admin.leads")}
          </Link>
          <Link
            className="rounded-md border border-[var(--color-border)] px-3 py-1.5 text-sm hover:bg-[var(--color-surface-inset)]"
            href="/administracija/property-desk/tim"
          >
            {t("admin.team")}
          </Link>
        </nav>
      )}
      {children}
    </div>
  );
}
