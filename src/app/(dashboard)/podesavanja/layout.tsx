import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import Link from "next/link";

import { loadUserContext } from "@/server/auth/context";
import { PageHeader } from "@/components/app/page-header";
import { createT } from "@/lib/i18n";
import type { PermissionString } from "@/server/permissions/access-control";

/**
 * Tenant-side settings layout. Moj nalog is available without an org
 * (every signed-in user). Other tabs need an active organization.
 */
export default async function SettingsLayout({ children }: { children: ReactNode }) {
  const ctx = await loadUserContext();
  if (!ctx) redirect("/sign-in");
  const t = createT(ctx.user.locale);
  const org = ctx.activeOrganization;
  const isInvestor = org?.type === "INVESTOR";
  const can = (perm: PermissionString) =>
    ctx.isSuperAdmin || ctx.permissions.includes(perm);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("nav.settings")}
        description={
          org ? t("ops.settings.orgName", { name: org.name }) : t("ops.settings.noOrg")
        }
      />
      <nav
        className="flex flex-wrap gap-2 border-b border-[var(--color-border)] pb-3"
        aria-label={t("ops.settings.sectionsAria")}
      >
        <Link
          className="rounded-md border border-[var(--color-border)] px-3 py-1.5 text-sm hover:bg-[var(--color-surface-inset)]"
          href="/podesavanja/profil"
        >
          {t("ops.settings.account")}
        </Link>
        {org ? (
          <Link
            className="rounded-md border border-[var(--color-border)] px-3 py-1.5 text-sm hover:bg-[var(--color-surface-inset)]"
            href="/podesavanja/organizacija"
          >
            {t("ops.settings.organization")}
          </Link>
        ) : null}
        {org && can("organization.members:manage") ? (
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
