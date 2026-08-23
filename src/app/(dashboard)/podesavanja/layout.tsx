import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import Link from "next/link";

import { loadUserContext } from "@/server/auth/context";
import { PageHeader } from "@/components/app/page-header";
import { createT } from "@/lib/i18n";
import type { PermissionString } from "@/server/permissions/access-control";

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
  const t = createT(ctx.user.locale);
  const isInvestor = ctx.activeOrganization.type === "INVESTOR";
  const can = (perm: PermissionString) =>
    ctx.isSuperAdmin || ctx.permissions.includes(perm);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("nav.settings")}
        description={t("ops.settings.orgName", { name: ctx.activeOrganization.name })}
      />
      <nav
        className="flex flex-wrap gap-2 border-b border-[var(--color-border)] pb-3"
        aria-label={t("ops.settings.sectionsAria")}
      >
        <Link
          className="rounded-md border border-[var(--color-border)] px-3 py-1.5 text-sm hover:bg-[var(--color-surface-inset)]"
          href="/podesavanja/organizacija"
        >
          {t("ops.settings.organization")}
        </Link>
        {can("organization.members:manage") ? (
          <Link
            className="rounded-md border border-[var(--color-border)] px-3 py-1.5 text-sm hover:bg-[var(--color-surface-inset)]"
            href="/podesavanja/korisnici"
          >
            {t("ops.settings.members")}
          </Link>
        ) : null}
        {isInvestor ? (
          <Link
            className="rounded-md border border-[var(--color-border)] px-3 py-1.5 text-sm hover:bg-[var(--color-surface-inset)]"
            href="/podesavanja/pretplata"
          >
            {t("ops.settings.subscription")}
          </Link>
        ) : null}
        {isInvestor && can("billing.invoice.read") ? (
          <Link
            className="rounded-md border border-[var(--color-border)] px-3 py-1.5 text-sm hover:bg-[var(--color-surface-inset)]"
            href="/podesavanja/fakture"
          >
            {t("ops.settings.invoices")}
          </Link>
        ) : null}
        {isInvestor && can("payment.manage") ? (
          <Link
            className="rounded-md border border-[var(--color-border)] px-3 py-1.5 text-sm hover:bg-[var(--color-surface-inset)]"
            href="/podesavanja/planovi-placanja"
          >
            {t("nav.paymentPlans")}
          </Link>
        ) : null}
        {isInvestor && can("sale.manage") ? (
          <Link
            className="rounded-md border border-[var(--color-border)] px-3 py-1.5 text-sm hover:bg-[var(--color-surface-inset)]"
            href="/podesavanja/ugovori-sabloni"
          >
            {t("ops.settings.contracts")}
          </Link>
        ) : null}
      </nav>
      {children}
    </div>
  );
}
