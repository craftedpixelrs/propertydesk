import Link from "next/link";
import { redirect } from "next/navigation";
import { Building2, BadgeCheck, Users, Handshake, Wallet, Store } from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { StatCard } from "@/components/app/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/app/empty-state";
import { loadUserContext } from "@/server/auth/context";
import {
  loadInvestorDashboard,
  loadAgencyDashboard,
} from "@/server/services/dashboard/dashboard.service";
import { formatDate, formatMoney } from "@/lib/formatters";
import type { SupportedCurrency } from "@/lib/constants/app";
import { t } from "@/lib/i18n";

export const dynamic = "force-dynamic";

const RESERVATION_LABELS: Record<string, string> = {
  REQUESTED: "Na čekanju",
  APPROVED: "Odobrena",
  REJECTED: "Odbijena",
  EXPIRED: "Istekla",
  CANCELED: "Otkazana",
  CONVERTED: "Prodaja",
};
const SALE_LABELS: Record<string, string> = {
  DRAFT: "Nacrt",
  PRE_CONTRACT: "Predugovor",
  CONTRACTED: "Ugovorena",
  PAYMENT_IN_PROGRESS: "Plaćanje u toku",
  PAID: "Plaćena",
  HANDED_OVER: "Primopredato",
  CANCELED: "Otkazana",
};
const REG_LABELS: Record<string, string> = {
  PENDING: "Na čekanju",
  APPROVED: "Odobrena",
  REJECTED: "Odbijena",
  EXPIRED: "Istekla",
  CONVERTED: "Konvertovana",
  CANCELED: "Otkazana",
  CONFLICT_REVIEW: "Konflikt",
};

export default async function DashboardPage() {
  const ctx = await loadUserContext();
  if (!ctx) redirect("/sign-in");

  // A SUPER_ADMIN always lands on the platform console. This holds true
  // even if the session happens to carry an `activeOrganizationId` (e.g.
  // stale from a prior operation), because the tenant dashboard has no
  // meaning outside of a specific tenant scope for platform operators.
  // Impersonation sessions are exempt because during impersonation
  // `session.user` is the impersonated user and `isSuperAdmin` returns
  // false, so this branch does not fire in that case.
  if (ctx.isSuperAdmin) redirect("/administracija");

  if (!ctx.activeOrganization) {
    return <PageHeader title={t("nav.dashboard")} description={t("organization.noOrgSubtitle")} />;
  }

  if (ctx.activeOrganization.type === "AGENCY") {
    return <AgencyDashboard organizationId={ctx.activeOrganization.id} name={ctx.activeOrganization.name} />;
  }
  return <InvestorDashboard organizationId={ctx.activeOrganization.id} name={ctx.activeOrganization.name} />;
}

async function InvestorDashboard({
  organizationId,
  name,
}: {
  organizationId: string;
  name: string;
}) {
  const data = await loadInvestorDashboard(organizationId);
  const currency = data.financial.currency as SupportedCurrency;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("nav.dashboard")}
        description={`${t("organization.switcherLabel")}: ${name}`}
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          label={t("nav.projects")}
          value={data.totals.projects}
          icon={<Building2 className="size-5" />}
        />
        <StatCard
          label="Dostupno jedinica"
          value={data.totals.unitsAvailable}
          hint={`Od ${data.totals.unitsTotal}`}
          icon={<Building2 className="size-5" />}
        />
        <StatCard
          label="Aktivne rezervacije"
          value={data.totals.activeReservations}
          icon={<BadgeCheck className="size-5" />}
        />
        <StatCard
          label={t("nav.sales")}
          value={data.totals.activeSales}
          icon={<Handshake className="size-5" />}
        />
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <StatCard
          label="Ugovoreno"
          value={formatMoney(data.financial.salesContractedTotal, currency)}
          icon={<Wallet className="size-5" />}
        />
        <StatCard
          label="Naplaćeno"
          value={formatMoney(data.financial.salesPaidTotal, currency)}
          icon={<Wallet className="size-5" />}
        />
        <StatCard
          label="Preostalo"
          value={formatMoney(data.financial.salesOutstandingTotal, currency)}
          icon={<Wallet className="size-5" />}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm">Poslednje rezervacije</CardTitle>
            <Link href="/rezervacije" className="text-xs text-[var(--color-brand-700)] hover:underline">
              Sve →
            </Link>
          </CardHeader>
          <CardContent>
            {data.recentReservations.length === 0 ? (
              <EmptyState title="Nema rezervacija" description="Nema stavki za prikaz." />
            ) : (
              <ul className="divide-y divide-[var(--color-border)]">
                {data.recentReservations.map((r) => (
                  <li key={r.id} className="flex items-center justify-between py-2 text-sm">
                    <Link
                      href={`/rezervacije/${r.id}`}
                      className="font-medium text-[var(--color-brand-700)] hover:underline"
                    >
                      {r.unitCode}
                    </Link>
                    <span className="text-[var(--color-foreground-muted)]">{r.buyerName}</span>
                    <span className="text-xs text-[var(--color-foreground-subtle)]">
                      {RESERVATION_LABELS[r.status] ?? r.status}
                    </span>
                    <span className="text-xs text-[var(--color-foreground-subtle)]">
                      {formatDate(r.createdAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm">Poslednje prodaje</CardTitle>
            <Link href="/prodaje" className="text-xs text-[var(--color-brand-700)] hover:underline">
              Sve →
            </Link>
          </CardHeader>
          <CardContent>
            {data.recentSales.length === 0 ? (
              <EmptyState title="Nema prodaja" description="Nema stavki za prikaz." />
            ) : (
              <ul className="divide-y divide-[var(--color-border)]">
                {data.recentSales.map((s) => (
                  <li key={s.id} className="flex items-center justify-between py-2 text-sm">
                    <Link
                      href={`/prodaje/${s.id}`}
                      className="font-medium text-[var(--color-brand-700)] hover:underline"
                    >
                      {s.unitCode}
                    </Link>
                    <span className="text-[var(--color-foreground-muted)]">{s.buyerName}</span>
                    <span className="text-xs text-[var(--color-foreground-subtle)]">
                      {SALE_LABELS[s.status] ?? s.status}
                    </span>
                    <span className="text-xs font-medium">
                      {formatMoney(s.finalPrice, s.currency as SupportedCurrency)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm">Nadolazeće rate (14 dana)</CardTitle>
          <div className="flex items-center gap-3 text-xs text-[var(--color-foreground-muted)]">
            <span>Zadaci danas: {data.totals.tasksToday}</span>
            <span>Prekoračeni: {data.totals.tasksOverdue}</span>
          </div>
        </CardHeader>
        <CardContent>
          {data.upcomingInstallments.length === 0 ? (
            <EmptyState
              title="Nema nadolazećih rata"
              description="U narednih 14 dana ne dospeva nijedna rata."
            />
          ) : (
            <ul className="divide-y divide-[var(--color-border)]">
              {data.upcomingInstallments.map((i) => (
                <li
                  key={i.id}
                  className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm"
                >
                  <Link
                    href={`/prodaje/${i.saleId}/plan-placanja`}
                    className="font-medium text-[var(--color-brand-700)] hover:underline"
                  >
                    {i.unitCode} · {i.name}
                  </Link>
                  <span className="text-[var(--color-foreground-muted)]">
                    {formatDate(i.dueDate)}
                  </span>
                  <span className="font-medium">
                    {formatMoney(i.amount, i.currency as SupportedCurrency)}
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

async function AgencyDashboard({
  organizationId,
  name,
}: {
  organizationId: string;
  name: string;
}) {
  const data = await loadAgencyDashboard(organizationId);
  const currency = data.financial.currency as SupportedCurrency;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("nav.dashboard")}
        description={`${t("organization.switcherLabel")}: ${name}`}
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          label="Konekcije"
          value={data.totals.activeConnections}
          icon={<Handshake className="size-5" />}
        />
        <StatCard
          label="Dostupni projekti"
          value={data.totals.accessibleProjects}
          icon={<Store className="size-5" />}
        />
        <StatCard
          label="Moji kupci"
          value={data.totals.activeBuyers}
          icon={<Users className="size-5" />}
        />
        <StatCard
          label="Provizije na čekanju"
          value={data.totals.pendingCommissions}
          icon={<Wallet className="size-5" />}
        />
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <StatCard
          label="Izračunato"
          value={formatMoney(data.financial.commissionCalculatedTotal, currency)}
        />
        <StatCard
          label="Odobreno"
          value={formatMoney(data.financial.commissionApprovedTotal, currency)}
        />
        <StatCard
          label="Isplaćeno"
          value={formatMoney(data.financial.commissionPaidTotal, currency)}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm">Poslednje prijave kupaca</CardTitle>
            <Link href="/moji-kupci" className="text-xs text-[var(--color-brand-700)] hover:underline">
              Svi →
            </Link>
          </CardHeader>
          <CardContent>
            {data.recentRegistrations.length === 0 ? (
              <EmptyState title="Nema prijava" description="Prijavite kupca iz ponude." />
            ) : (
              <ul className="divide-y divide-[var(--color-border)]">
                {data.recentRegistrations.map((r) => (
                  <li key={r.id} className="flex items-center justify-between py-2 text-sm">
                    <span className="font-medium">{r.buyerName}</span>
                    <span className="text-[var(--color-foreground-muted)]">{r.projectName}</span>
                    <span className="text-xs">{REG_LABELS[r.status] ?? r.status}</span>
                    <span className="text-xs text-[var(--color-foreground-subtle)]">
                      {formatDate(r.createdAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm">Moje rezervacije</CardTitle>
            <Link href="/moje-rezervacije" className="text-xs text-[var(--color-brand-700)] hover:underline">
              Sve →
            </Link>
          </CardHeader>
          <CardContent>
            {data.recentReservations.length === 0 ? (
              <EmptyState title="Nema rezervacija" description="Nema stavki za prikaz." />
            ) : (
              <ul className="divide-y divide-[var(--color-border)]">
                {data.recentReservations.map((r) => (
                  <li key={r.id} className="flex items-center justify-between py-2 text-sm">
                    <span className="font-medium">{r.unitCode}</span>
                    <span className="text-xs">{RESERVATION_LABELS[r.status] ?? r.status}</span>
                    <span className="text-xs text-[var(--color-foreground-subtle)]">
                      {formatDate(r.createdAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
