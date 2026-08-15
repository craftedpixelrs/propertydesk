import { redirect } from "next/navigation";
import Link from "next/link";
import { Building2, Users, Shield, Layers, BadgeCheck, Handshake } from "lucide-react";

import { StatCard } from "@/components/app/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatDateTime } from "@/lib/formatters/date";
import { getSession, isSuperAdmin } from "@/server/auth/session";
import { loadPlatformDashboard } from "@/server/services/dashboard/dashboard.service";

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

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          label="Organizacije"
          value={data.totals.totalOrganizations}
          hint={`${data.totals.activeOrganizations} aktivnih · ${data.totals.trialOrganizations} probnih`}
          icon={<Building2 className="size-5" />}
        />
        <StatCard
          label="Korisnici"
          value={data.totals.totalUsers}
          icon={<Users className="size-5" />}
        />
        <StatCard
          label="Projekti"
          value={data.totals.totalProjects}
          icon={<Layers className="size-5" />}
        />
        <StatCard
          label="Jedinice"
          value={data.totals.totalUnits}
          icon={<Layers className="size-5" />}
        />
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          label="Prodaje"
          value={data.totals.totalSales}
          icon={<Handshake className="size-5" />}
        />
        <StatCard
          label="Aktivne rezervacije"
          value={data.totals.activeReservations}
          icon={<BadgeCheck className="size-5" />}
        />
        <StatCard
          label="Suspendovano"
          value={data.totals.suspendedOrganizations}
          icon={<Shield className="size-5" />}
        />
        <StatCard
          label="Uloga"
          value="SUPER_ADMIN"
          icon={<Shield className="size-5" />}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Probni periodi koji ističu (7 dana)</CardTitle>
          </CardHeader>
          <CardContent>
            {data.trialsExpiringSoon.length === 0 ? (
              <p className="text-sm text-[var(--color-foreground-muted)]">
                Nema probnih pretplata koje uskoro ističu.
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
                      Ističe {formatDate(s.trialEndsAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Raspodela po tipu</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {data.organizationsByType.map((row) => (
                <li key={row.type} className="flex items-center justify-between">
                  <span>{row.type === "INVESTOR" ? "Investitori" : "Agencije"}</span>
                  <span className="font-medium">{row.count}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Poslednje revizijske stavke</CardTitle>
        </CardHeader>
        <CardContent>
          {data.recentAudit.length === 0 ? (
            <p className="text-sm text-[var(--color-foreground-muted)]">
              Nema revizijskih zapisa.
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
                    {row.actorEmail ?? "sistem"} · {row.organizationName ?? "—"}
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
