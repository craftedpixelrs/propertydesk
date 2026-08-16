import Link from "next/link";
import { redirect } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PermissionGuard } from "@/components/app/permission-guard";
import { loadUserContext } from "@/server/auth/context";
import { listConnections } from "@/server/services/agencies/agencies.service";
import { formatDate } from "@/lib/formatters";
import { InviteAgencyForm } from "@/features/agencies/invite-agency-form";
import { createT, type TranslationKey } from "@/lib/i18n";
import type { AgencyConnectionStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const CONNECTION_STATUS_KEYS: Record<AgencyConnectionStatus, TranslationKey> = {
  INVITED: "partners.connectionStatus.INVITED",
  ACTIVE: "partners.connectionStatus.ACTIVE",
  SUSPENDED: "partners.connectionStatus.SUSPENDED",
  REJECTED: "partners.connectionStatus.REJECTED",
  TERMINATED: "partners.connectionStatus.TERMINATED",
};

const STATUS_TONE: Record<AgencyConnectionStatus, string> = {
  INVITED: "bg-amber-100 text-amber-700",
  ACTIVE: "bg-emerald-100 text-emerald-700",
  SUSPENDED: "bg-orange-100 text-orange-700",
  REJECTED: "bg-rose-100 text-rose-700",
  TERMINATED: "bg-neutral-200 text-neutral-700",
};

export default async function AgencijePage() {
  const ctx = await loadUserContext();
  if (!ctx) redirect("/sign-in");
  if (!ctx.activeOrganization) redirect("/podesavanja");
  if (ctx.activeOrganization.type !== "INVESTOR") {
    redirect("/dashboard");
  }

  const t = createT(ctx.user.locale);

  const { items, total } = await listConnections({
    organizationId: ctx.activeOrganization.id,
    role: "INVESTOR",
    page: 1,
    pageSize: 50,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{t("nav.agencies")}</h1>
          <p className="text-sm text-[var(--color-foreground-muted)]">
            {t("partners.agencies.subtitle")}
          </p>
        </div>
        <PermissionGuard permission="agency.manage">
          <InviteAgencyForm />
        </PermissionGuard>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">
            {t("partners.agencies.totalConnections", { count: total })}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {items.length === 0 ? (
            <div className="py-12 text-center text-sm text-[var(--color-foreground-muted)]">
              {t("partners.agencies.empty")}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-[var(--color-border)] text-sm">
                <thead className="bg-[var(--color-surface-inset)] text-left text-xs uppercase tracking-wide text-[var(--color-foreground-muted)]">
                  <tr>
                    <th className="px-4 py-3">{t("organization.types.agency")}</th>
                    <th className="px-4 py-3">{t("common.statusLabel")}</th>
                    <th className="px-4 py-3 text-right">{t("nav.projects")}</th>
                    <th className="px-4 py-3 text-right">{t("partners.protectionDays")}</th>
                    <th className="px-4 py-3 text-right">{t("partners.invited")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {items.map((c) => (
                    <tr key={c.id} className="hover:bg-[var(--color-surface-inset)]">
                      <td className="px-4 py-3">
                        <Link
                          href={`/agencije/${c.id}`}
                          className="font-medium text-[var(--color-brand-700)] hover:underline"
                        >
                          {c.agency.profile?.displayName ?? c.agency.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_TONE[c.status]}`}
                        >
                          {t(CONNECTION_STATUS_KEYS[c.status])}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {c._count.projectAccess}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {c.defaultProtectionDays}
                      </td>
                      <td className="px-4 py-3 text-right text-[var(--color-foreground-muted)]">
                        {formatDate(c.invitedAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center gap-3 text-sm">
        <Button asChild variant="outline">
          <Link href="/agencije/registracije">{t("nav.agencyRegistrations")}</Link>
        </Button>
        <PermissionGuard permission="commission.manage">
          <Button asChild variant="outline">
            <Link href="/provizije">{t("partners.agencies.commissionRules")}</Link>
          </Button>
        </PermissionGuard>
      </div>
    </div>
  );
}
