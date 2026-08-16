import { redirect } from "next/navigation";
import Link from "next/link";
import { Building2, Users, Shield, Layers, BadgeCheck, Handshake } from "lucide-react";

import { StatCard } from "@/components/app/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatDateTime } from "@/lib/formatters/date";
import { getSession, isSuperAdmin } from "@/server/auth/session";
import { loadPlatformDashboard } from "@/server/services/dashboard/dashboard.service";
import { createT } from "@/lib/i18n";
import { resolveRequestLocale } from "@/lib/i18n/resolve-locale";

export const dynamic = "force-dynamic";

/**
 * Platform-admin landing page — real system-wide aggregates + trial expiry
 * watchlist + latest 15 audit rows.
 *
 * Team-only Property Desk members (not SUPER_ADMIN) share this outer layout
 * but must NOT see the platform-wide dashboard — they are redirected to
 * their own Property Desk overview.
 */
export default async function PlatformAdminOverviewPage() {
  const session = await getSession();
  if (!session || !isSuperAdmin(session)) {
    redirect("/administracija/property-desk");
  }

  const data = await loadPlatformDashboard();
  const t = createT(await resolveRequestLocale());

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          label={t("admin.organizations")}
          value={data.totals.totalOrganizations}
          hint={t("admin.overviewPage.orgsHint", {
            active: data.totals.activeOrganizations,
            trial: data.totals.trialOrganizations,
          })}
          icon={<Building2 className="size-5" />}
        />
        <StatCard
          label={t("admin.users")}
          value={data.totals.totalUsers}
          icon={<Users className="size-5" />}
        />
        <StatCard
          label={t("nav.projects")}
          value={data.totals.totalProjects}
          icon={<Layers className="size-5" />}
        />
        <StatCard
          label={t("nav.inventory")}
          value={data.totals.totalUnits}
          icon={<Layers className="size-5" />}
        />
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          label={t("nav.sales")}
          value={data.totals.totalSales}
          icon={<Handshake className="size-5" />}
        />
        <StatCard
          label={t("ui.dashboard.activeReservations")}
          value={data.totals.activeReservations}
          icon={<BadgeCheck className="size-5" />}
        />
        <StatCard
          label={t("status.suspended")}
          value={data.totals.suspendedOrganizations}
          icon={<Shield className="size-5" />}
        />
        <StatCard
          label={t("admin.overviewPage.role")}
          value="SUPER_ADMIN"
          icon={<Shield className="size-5" />}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t("admin.overviewPage.trialsTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            {data.trialsExpiringSoon.length === 0 ? (
              <p className="text-sm text-[var(--color-foreground-muted)]">
                {t("admin.overviewPage.noTrials")}
              </p>
            ) : (
              <ul className="divide-y divide-[var(--color-border)]">
                {data.trialsExpiringSoon.map((s) => (
                  <li key={s.id} className="flex items-center justify-between py-2 text-sm">
                    <Link
                      href={`/administracija/organizacije`}
                      className="font-medium text-[var(--color-brand-700)] hover:underline"
                    >
                      {s.organizationName}
                    </Link>
                    <span className="text-xs text-[var(--color-foreground-muted)]">
                      {t("admin.overviewPage.expires", { date: formatDate(s.trialEndsAt) })}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t("admin.overviewPage.byType")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {data.organizationsByType.map((row) => (
                <li key={row.type} className="flex items-center justify-between">
                  <span>
                    {row.type === "INVESTOR"
                      ? t("admin.investors")
                      : t("admin.agencies")}
                  </span>
                  <span className="font-medium">{row.count}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{t("admin.overviewPage.recentAudit")}</CardTitle>
        </CardHeader>
        <CardContent>
          {data.recentAudit.length === 0 ? (
            <p className="text-sm text-[var(--color-foreground-muted)]">
              {t("admin.overviewPage.noAudit")}
            </p>
          ) : (
            <ul className="divide-y divide-[var(--color-border)]">
              {data.recentAudit.map((row) => (
                <li
                  key={row.id}
                  className="grid gap-1 py-3 sm:grid-cols-[10rem_1fr_10rem]"
                >
                  <span className="text-xs text-[var(--color-foreground-muted)]">
                    {formatDateTime(row.createdAt)}
                  </span>
                  <div className="text-sm">
                    <span className="font-mono text-xs text-[var(--color-brand-700)]">
                      {row.action}
                    </span>
                    <span className="ml-2 text-[var(--color-foreground-muted)]">
                      {row.entityType}
                      {row.entityId ? `#${row.entityId.slice(0, 8)}` : ""}
                    </span>
                  </div>
                  <span className="text-xs text-[var(--color-foreground-muted)]">
                    {t("admin.overviewPage.actorLine", {
                      email: row.actorEmail ?? t("admin.system"),
                      org: row.organizationName ?? t("admin.dash"),
                    })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
