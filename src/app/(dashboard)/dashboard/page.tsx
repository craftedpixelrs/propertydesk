import Link from "next/link";
import { redirect } from "next/navigation";
import { Building2, BadgeCheck, Users, Handshake, Wallet, Store } from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { StatCard } from "@/components/app/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/app/empty-state";
import { ChartCard } from "@/components/charts/chart-card";
import { StatusDonut } from "@/components/charts/status-donut";
import { CategoryBars } from "@/components/charts/category-bars";
import { unitStatusColor, saleStatusColor } from "@/components/charts/palette";
import { loadUserContext } from "@/server/auth/context";
import {
  loadInvestorDashboard,
  loadAgencyDashboard,
} from "@/server/services/dashboard/dashboard.service";
import { loadOnboardingState } from "@/server/services/onboarding.service";
import { buildCashFlowProjection } from "@/server/services/reports/cash-flow.service";
import { OnboardingChecklist } from "@/features/onboarding/onboarding-checklist";
import { CashFlowCard } from "@/features/reports/cash-flow-card";
import { formatDate, formatMoney } from "@/lib/formatters";
import type { SupportedCurrency } from "@/lib/constants/app";
import { enumLabel, t, unitStatusLabel, type Locale } from "@/lib/i18n";

export const dynamic = "force-dynamic";

function saleStatusKey(status: string): string {
  return status === "PRE_CONTRACT" ? "PRECONTRACT" : status;
}

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

  // Property Desk internal-team members without a tenant land on their
  // operational panel. They don't have any tenant permissions and would
  // otherwise stare at a "no organization" empty state despite having
  // real work available under /administracija/property-desk.
  if (!ctx.activeOrganization && ctx.propertyDeskTeam?.enabled) {
    redirect("/administracija/property-desk");
  }

  const locale = ctx.user.locale;

  if (!ctx.activeOrganization) {
    return (
      <PageHeader
        title={t("nav.dashboard", undefined, locale)}
        description={t("organization.noOrgSubtitle", undefined, locale)}
      />
    );
  }

  if (ctx.activeOrganization.type === "AGENCY") {
    return (
      <AgencyDashboard
        organizationId={ctx.activeOrganization.id}
        name={ctx.activeOrganization.name}
        locale={locale}
      />
    );
  }
  return (
    <InvestorDashboard
      organizationId={ctx.activeOrganization.id}
      name={ctx.activeOrganization.name}
      locale={locale}
    />
  );
}

async function InvestorDashboard({
  organizationId,
  name,
  locale,
}: {
  organizationId: string;
  name: string;
  locale: Locale;
}) {
  const [data, onboarding, cashflow] = await Promise.all([
    loadInvestorDashboard(organizationId),
    loadOnboardingState(organizationId),
    buildCashFlowProjection({ organizationId, months: 12 }),
  ]);
  const currency = data.financial.currency as SupportedCurrency;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("nav.dashboard", undefined, locale)}
        description={`${t("organization.switcherLabel", undefined, locale)}: ${name}`}
      />

      {onboarding.visible ? (
        <OnboardingChecklist
          state={{
            steps: onboarding.steps,
            completedCount: onboarding.completedCount,
            totalCount: onboarding.totalCount,
            allDone: onboarding.allDone,
          }}
        />
      ) : null}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          label={t("nav.projects", undefined, locale)}
          value={data.totals.projects}
          icon={<Building2 className="size-5" />}
        />
        <StatCard
          label={t("ui.dashboard.availableUnits", undefined, locale)}
          value={data.totals.unitsAvailable}
          hint={t("ui.dashboard.ofTotal", { total: data.totals.unitsTotal }, locale)}
          icon={<Building2 className="size-5" />}
        />
        <StatCard
          label={t("ui.dashboard.activeReservations", undefined, locale)}
          value={data.totals.activeReservations}
          icon={<BadgeCheck className="size-5" />}
        />
        <StatCard
          label={t("nav.sales", undefined, locale)}
          value={data.totals.activeSales}
          icon={<Handshake className="size-5" />}
        />
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label={t("ui.dashboard.inventoryValue", undefined, locale)}
          value={formatMoney(data.financial.inventoryValueTotal, currency)}
          hint={t("ui.dashboard.inventoryValueHint", undefined, locale)}
          icon={<Wallet className="size-5" />}
        />
        <StatCard
          label={t("ui.dashboard.contracted", undefined, locale)}
          value={formatMoney(data.financial.salesContractedTotal, currency)}
          icon={<Wallet className="size-5" />}
        />
        <StatCard
          label={t("ui.dashboard.collected", undefined, locale)}
          value={formatMoney(data.financial.salesPaidTotal, currency)}
          icon={<Wallet className="size-5" />}
        />
        <StatCard
          label={t("ui.dashboard.outstanding", undefined, locale)}
          value={formatMoney(data.financial.salesOutstandingTotal, currency)}
          icon={<Wallet className="size-5" />}
        />
      </div>

      <CashFlowCard
        projection={cashflow}
        title={t("ui.dashboard.cashFlowTitle", undefined, locale)}
        description={t("ui.dashboard.cashFlowDescription", undefined, locale)}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard
          title={t("ui.dashboard.inventoryByStatus", undefined, locale)}
          description={t("ui.dashboard.unitsTotal", { total: data.totals.unitsTotal }, locale)}
          isEmpty={data.totals.unitsTotal === 0}
          height={260}
        >
          <StatusDonut
            centerLabel={t("ui.dashboard.total", undefined, locale)}
            data={data.inventoryByStatus.map((row) => ({
              key: row.status,
              label: unitStatusLabel(row.status, locale),
              value: row.count,
              color: unitStatusColor[row.status],
            }))}
          />
        </ChartCard>

        <ChartCard
          title={t("ui.dashboard.salesByStatus", undefined, locale)}
          description={t("ui.dashboard.salesByStatusHint", undefined, locale)}
          isEmpty={data.salesByStatus.reduce((a, b) => a + b.count, 0) === 0}
          height={260}
        >
          <CategoryBars
            data={data.salesByStatus.map((row) => ({
              key: row.status,
              label: enumLabel("sale", saleStatusKey(row.status), locale),
              value: row.count,
              color: saleStatusColor[row.status],
            }))}
          />
        </ChartCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm">
              {t("ui.dashboard.recentReservations", undefined, locale)}
            </CardTitle>
            <Link href="/rezervacije" className="text-xs text-[var(--color-brand-700)] hover:underline">
              {t("ui.dashboard.viewAll", undefined, locale)}
            </Link>
          </CardHeader>
          <CardContent>
            {data.recentReservations.length === 0 ? (
              <EmptyState
                title={t("ui.dashboard.noReservations", undefined, locale)}
                description={t("ui.dashboard.noItems", undefined, locale)}
              />
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
                      {enumLabel("reservation", r.status, locale)}
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
            <CardTitle className="text-sm">
              {t("ui.dashboard.recentSales", undefined, locale)}
            </CardTitle>
            <Link href="/prodaje" className="text-xs text-[var(--color-brand-700)] hover:underline">
              {t("ui.dashboard.viewAll", undefined, locale)}
            </Link>
          </CardHeader>
          <CardContent>
            {data.recentSales.length === 0 ? (
              <EmptyState
                title={t("ui.dashboard.noSales", undefined, locale)}
                description={t("ui.dashboard.noItems", undefined, locale)}
              />
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
                      {enumLabel("sale", saleStatusKey(s.status), locale)}
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
          <CardTitle className="text-sm">
            {t("ui.dashboard.upcomingInstallments", undefined, locale)}
          </CardTitle>
          <div className="flex items-center gap-3 text-xs text-[var(--color-foreground-muted)]">
            <span>
              {t("ui.dashboard.tasksToday", { count: data.totals.tasksToday }, locale)}
            </span>
            <span>
              {t("ui.dashboard.tasksOverdue", { count: data.totals.tasksOverdue }, locale)}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          {data.upcomingInstallments.length === 0 ? (
            <EmptyState
              title={t("ui.dashboard.noUpcomingInstallments", undefined, locale)}
              description={t("ui.dashboard.noUpcomingInstallmentsHint", undefined, locale)}
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
  locale,
}: {
  organizationId: string;
  name: string;
  locale: Locale;
}) {
  const data = await loadAgencyDashboard(organizationId);
  const currency = data.financial.currency as SupportedCurrency;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("nav.dashboard", undefined, locale)}
        description={`${t("organization.switcherLabel", undefined, locale)}: ${name}`}
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          label={t("ui.dashboard.connections", undefined, locale)}
          value={data.totals.activeConnections}
          icon={<Handshake className="size-5" />}
        />
        <StatCard
          label={t("ui.dashboard.accessibleProjects", undefined, locale)}
          value={data.totals.accessibleProjects}
          icon={<Store className="size-5" />}
        />
        <StatCard
          label={t("ui.dashboard.myBuyers", undefined, locale)}
          value={data.totals.activeBuyers}
          icon={<Users className="size-5" />}
        />
        <StatCard
          label={t("ui.dashboard.pendingCommissions", undefined, locale)}
          value={data.totals.pendingCommissions}
          icon={<Wallet className="size-5" />}
        />
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <StatCard
          label={t("ui.dashboard.commissionCalculated", undefined, locale)}
          value={formatMoney(data.financial.commissionCalculatedTotal, currency)}
        />
        <StatCard
          label={t("ui.dashboard.commissionApproved", undefined, locale)}
          value={formatMoney(data.financial.commissionApprovedTotal, currency)}
        />
        <StatCard
          label={t("ui.dashboard.commissionPaid", undefined, locale)}
          value={formatMoney(data.financial.commissionPaidTotal, currency)}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm">
              {t("ui.dashboard.recentRegistrations", undefined, locale)}
            </CardTitle>
            <Link href="/moji-kupci" className="text-xs text-[var(--color-brand-700)] hover:underline">
              {t("ui.dashboard.viewAll", undefined, locale)}
            </Link>
          </CardHeader>
          <CardContent>
            {data.recentRegistrations.length === 0 ? (
              <EmptyState
                title={t("ui.dashboard.noRegistrations", undefined, locale)}
                description={t("ui.dashboard.noRegistrationsHint", undefined, locale)}
              />
            ) : (
              <ul className="divide-y divide-[var(--color-border)]">
                {data.recentRegistrations.map((r) => (
                  <li key={r.id} className="flex items-center justify-between py-2 text-sm">
                    <span className="font-medium">{r.buyerName}</span>
                    <span className="text-[var(--color-foreground-muted)]">{r.projectName}</span>
                    <span className="text-xs">{enumLabel("registration", r.status, locale)}</span>
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
            <CardTitle className="text-sm">
              {t("ui.dashboard.myReservations", undefined, locale)}
            </CardTitle>
            <Link href="/moje-rezervacije" className="text-xs text-[var(--color-brand-700)] hover:underline">
              {t("ui.dashboard.viewAll", undefined, locale)}
            </Link>
          </CardHeader>
          <CardContent>
            {data.recentReservations.length === 0 ? (
              <EmptyState
                title={t("ui.dashboard.noReservations", undefined, locale)}
                description={t("ui.dashboard.noItems", undefined, locale)}
              />
            ) : (
              <ul className="divide-y divide-[var(--color-border)]">
                {data.recentReservations.map((r) => (
                  <li key={r.id} className="flex items-center justify-between py-2 text-sm">
                    <span className="font-medium">{r.unitCode}</span>
                    <span className="text-xs">{enumLabel("reservation", r.status, locale)}</span>
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
