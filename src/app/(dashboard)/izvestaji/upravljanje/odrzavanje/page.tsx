import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { StatCard } from "@/components/app/stat-card";
import { Button } from "@/components/ui/button";
import { loadUserContext, requireTenantPage } from "@/server/auth/context";
import { buildMaintenanceProgramReport } from "@/server/services/manager/reports.service";
import { prisma } from "@/server/db/prisma";
import { formatMoney } from "@/lib/formatters";
import { createT } from "@/lib/i18n";
import type { MaintenanceCategory } from "@prisma/client";

export const dynamic = "force-dynamic";

const CATEGORY_LABEL_SR: Record<MaintenanceCategory, string> = {
  PLUMBING: "Vodovod",
  ELECTRICAL: "Struja",
  HEATING: "Grejanje",
  ELEVATOR: "Lift",
  COMMON_AREAS: "Zajednički prostori",
  ROOF: "Krov",
  FACADE: "Fasada",
  SECURITY: "Obezbeđenje",
  CLEANING: "Čišćenje",
  OTHER: "Ostalo",
};

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/**
 * Program održavanja — total number of maintenance tickets per
 * building × category, status mix and realised vs estimated cost. Lets
 * managers justify fund usage to the assembly and plan next year.
 */
export default async function MaintenanceProgramReport({ searchParams }: PageProps) {
  const ctx = await loadUserContext();
  requireTenantPage(ctx, { permission: "report.read", orgType: "MANAGER" });
  const t = createT(ctx.user.locale);

  const sp = await searchParams;
  const now = new Date();
  const yearRaw = typeof sp.year === "string" ? parseInt(sp.year, 10) : now.getFullYear();
  const year = Number.isFinite(yearRaw) ? yearRaw : now.getFullYear();
  const buildingId = typeof sp.buildingId === "string" && sp.buildingId ? sp.buildingId : null;

  const from = new Date(Date.UTC(year, 0, 1));
  const to = new Date(Date.UTC(year + 1, 0, 1));

  const [report, buildings] = await Promise.all([
    buildMaintenanceProgramReport({
      organizationId: ctx.activeOrganization.id,
      from,
      to,
      buildingId,
    }),
    prisma.managedBuilding.findMany({
      where: { organizationId: ctx.activeOrganization.id, archivedAt: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const exportCsv = new URLSearchParams({
    report: "manager-maintenance",
    format: "csv",
    year: String(year),
    ...(buildingId ? { buildingId } : {}),
  }).toString();
  const exportXlsx = new URLSearchParams({
    report: "manager-maintenance",
    format: "xlsx",
    year: String(year),
    ...(buildingId ? { buildingId } : {}),
  }).toString();

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("manager.reports.maintenanceTitle")}
        description={t("manager.reports.maintenanceDesc")}
      />

      <form
        method="GET"
        className="flex flex-wrap items-end gap-3 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-3"
      >
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-[var(--color-foreground-muted)]">{t("manager.reports.year")}</span>
          <input
            name="year"
            type="number"
            defaultValue={year}
            className="h-9 w-28 rounded-md border border-[var(--color-border)] bg-white px-3 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-[var(--color-foreground-muted)]">
            {t("manager.reports.building")}
          </span>
          <select
            name="buildingId"
            defaultValue={buildingId ?? ""}
            className="h-9 min-w-[12rem] rounded-md border border-[var(--color-border)] bg-white px-2 text-sm"
          >
            <option value="">{t("manager.reports.allBuildings")}</option>
            {buildings.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
        <Button type="submit" variant="outline" size="sm">
          {t("common.open")}
        </Button>
        <div className="ml-auto flex gap-2">
          <Button asChild variant="outline" size="sm">
            <a href={`/api/v1/manager/reports/export?${exportCsv}`}>
              {t("manager.reports.exportCsv")}
            </a>
          </Button>
          <Button asChild variant="outline" size="sm">
            <a href={`/api/v1/manager/reports/export?${exportXlsx}`}>
              {t("manager.reports.exportXlsx")}
            </a>
          </Button>
        </div>
      </form>

      <div className="grid gap-3 md:grid-cols-4">
        <StatCard
          label={t("manager.reports.maintenanceTotal")}
          value={String(report.totals.totalCount)}
        />
        <StatCard
          label={t("manager.reports.maintenanceOpen")}
          value={String(report.totals.openCount)}
        />
        <StatCard
          label={t("manager.reports.maintenanceCompleted")}
          value={String(report.totals.completedCount)}
        />
        <StatCard
          label={t("manager.reports.maintenanceActualCost")}
          value={formatMoney(report.totals.actualCost, "RSD")}
          hint={`${t("manager.reports.maintenanceEstimated")}: ${formatMoney(
            report.totals.estimatedCost,
            "RSD",
          )}`}
        />
      </div>

      {report.rows.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-[var(--color-foreground-muted)]">
            —
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-md border border-[var(--color-border)] bg-[var(--color-surface)]">
          <table className="min-w-full divide-y divide-[var(--color-border)] text-sm">
            <thead className="bg-[var(--color-surface-inset)] text-left text-xs tracking-wide text-[var(--color-foreground-muted)] uppercase">
              <tr>
                <th className="px-4 py-3">{t("manager.reports.building")}</th>
                <th className="px-4 py-3">{t("manager.ticket.categoryField")}</th>
                <th className="px-4 py-3 text-right">#</th>
                <th className="px-4 py-3 text-right">{t("manager.reports.maintenanceOpen")}</th>
                <th className="px-4 py-3 text-right">
                  {t("manager.reports.maintenanceCompleted")}
                </th>
                <th className="px-4 py-3 text-right">
                  {t("manager.reports.maintenanceEstimated")}
                </th>
                <th className="px-4 py-3 text-right">
                  {t("manager.reports.maintenanceActualCost")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {report.rows.map((r) => (
                <tr
                  key={`${r.buildingId}-${r.category}`}
                  className="hover:bg-[var(--color-surface-inset)]"
                >
                  <td className="px-4 py-3">{r.buildingName}</td>
                  <td className="px-4 py-3">{CATEGORY_LABEL_SR[r.category]}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{r.totalCount}</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {r.openCount + r.inProgressCount + r.awaitingPartsCount}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{r.completedCount}</td>
                  <td className="px-4 py-3 text-right font-mono">
                    {formatMoney(r.estimatedCost, "RSD")}
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    {formatMoney(r.actualCost, "RSD")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {report.byCategory.length > 0 ? (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {report.byCategory.map((c) => (
            <Card key={c.category}>
              <CardContent className="py-3">
                <div className="text-xs text-[var(--color-foreground-muted)]">
                  {CATEGORY_LABEL_SR[c.category]}
                </div>
                <div className="mt-1 flex items-end justify-between gap-3">
                  <div className="text-2xl font-semibold tabular-nums">{c.count}</div>
                  <div className="text-sm text-[var(--color-foreground-muted)]">
                    {formatMoney(c.actualCost, "RSD")}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}
    </div>
  );
}
