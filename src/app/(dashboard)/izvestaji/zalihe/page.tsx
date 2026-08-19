import { redirect } from "next/navigation";

import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/app/stat-card";
import {
  ReportFilters,
  parseReportSearchParams,
  toReportFilters,
  exportHrefs,
} from "@/features/reports/report-filters";
import { requirePermission } from "@/server/permissions/require";
import { prisma } from "@/server/db/prisma";
import {
  buildInventoryReport,
  buildInventoryVelocity,
} from "@/server/services/reports/reports.service";
import { formatMoney } from "@/lib/formatters/money";
import type { SupportedCurrency } from "@/lib/constants/app";
import { ChartCard } from "@/components/charts/chart-card";
import { StatusDonut } from "@/components/charts/status-donut";
import { CategoryBars } from "@/components/charts/category-bars";
import { unitStatusColor } from "@/components/charts/palette";
import { createT, unitStatusLabel } from "@/lib/i18n";
import { resolveRequestLocale } from "@/lib/i18n/resolve-locale";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function InventoryReportPage({ searchParams }: PageProps) {
  const ctx = await requirePermission("report.read");
  if (!ctx.organization) redirect("/dashboard");
  const t = createT(await resolveRequestLocale());
  const sp = await searchParams;
  const parsed = parseReportSearchParams(sp);
  const filters = toReportFilters({
    organizationId: ctx.organization.organizationId,
    ...parsed,
  });

  const [report, projects, velocity] = await Promise.all([
    buildInventoryReport(filters),
    prisma.project.findMany({
      where: { organizationId: ctx.organization.organizationId, archivedAt: null },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    buildInventoryVelocity(filters),
  ]);

  const currency = report.totals.currency as SupportedCurrency;
  const hrefs = exportHrefs("inventory", parsed);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("ops.reports.inventoryTitle")}
        description={t("ops.reports.inventoryDesc")}
      />

      <ReportFilters
        action="/izvestaji/zalihe"
        projects={projects}
        selectedProjectId={parsed.projectId}
        from={parsed.from}
        to={parsed.to}
        exportCsvHref={hrefs.csv}
        exportXlsxHref={hrefs.xlsx}
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label={t("ops.reports.totalUnits")} value={report.totals.units} />
        <StatCard label={t("ops.reports.areaM2")} value={report.totals.areaTotal} />
        <StatCard
          label={t("ops.reports.stockValue")}
          value={formatMoney(report.totals.priceTotal, currency)}
        />
        <StatCard label={t("ops.reports.projectCount")} value={projects.length} />
      </div>

      {(() => {
        // Aggregate report.rows (project × status) into the two shapes the
        // charts need: (a) donut of total jedinica per status; (b) stacked
        // bar of jedinica per project × status.
        const byStatusMap = new Map<string, number>();
        const projectMap = new Map<string, { name: string; perStatus: Record<string, number> }>();
        for (const row of report.rows) {
          byStatusMap.set(row.status, (byStatusMap.get(row.status) ?? 0) + row.count);
          const bucket = projectMap.get(row.projectId) ?? {
            name: row.projectName,
            perStatus: {},
          };
          bucket.perStatus[row.status] = (bucket.perStatus[row.status] ?? 0) + row.count;
          projectMap.set(row.projectId, bucket);
        }
        const donutData = Array.from(byStatusMap.entries()).map(([status, count]) => ({
          key: status,
          label: unitStatusLabel(status, t),
          value: count,
          color: unitStatusColor[status],
        }));
        const stackedStatuses = Array.from(byStatusMap.keys());
        const stackedData = Array.from(projectMap.entries()).map(([id, info]) => {
          const datum: Record<string, string | number> = {
            key: id,
            label: info.name,
          };
          for (const s of stackedStatuses) {
            datum[s] = info.perStatus[s] ?? 0;
          }
          return datum as {
            key: string;
            label: string;
            [seriesKey: string]: string | number;
          };
        });
        const stackedSeries = stackedStatuses.map((s) => ({
          key: s,
          label: unitStatusLabel(s, t),
          color: unitStatusColor[s],
        }));

        return (
          <div className="grid gap-6 lg:grid-cols-2">
            <ChartCard
              title={t("ops.reports.statusDistribution")}
              description={t("ops.reports.unitsTotalDesc", { count: report.totals.units })}
              isEmpty={donutData.length === 0}
              height={280}
            >
              <StatusDonut centerLabel={t("ops.reports.unitsCenter")} data={donutData} />
            </ChartCard>

            <ChartCard
              title={t("ops.reports.stockByProject")}
              description={t("ops.reports.stockByProjectDesc")}
              isEmpty={stackedData.length === 0}
              height={280}
            >
              <CategoryBars
                data={stackedData}
                series={stackedSeries}
                stacked
                colorPerBar={false}
              />
            </ChartCard>
          </div>
        );
      })()}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{t("ops.reports.timeToSale")}</CardTitle>
          <p className="text-xs text-[var(--color-foreground-muted)]">
            {t("ops.reports.timeToSaleHint")}
          </p>
        </CardHeader>
        <CardContent>
          {velocity.overall.soldCount === 0 ? (
            <p className="py-6 text-center text-sm text-[var(--color-foreground-muted)]">
              {t("ops.reports.noSalesInPeriod")}
            </p>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <StatCard label={t("ops.reports.sold")} value={velocity.overall.soldCount} />
                <StatCard
                  label={t("ops.reports.mean")}
                  value={t("ops.reports.daysShort", { n: velocity.overall.meanDays })}
                />
                <StatCard
                  label={t("ops.reports.median")}
                  value={t("ops.reports.daysShort", { n: velocity.overall.p50Days })}
                />
                <StatCard
                  label={t("ops.reports.p90")}
                  value={t("ops.reports.daysShort", { n: velocity.overall.p90Days })}
                />
              </div>
              {velocity.byProject.length > 1 ? (
                <table className="w-full text-sm">
                  <thead className="text-left text-xs text-[var(--color-foreground-muted)]">
                    <tr>
                      <th className="py-1">{t("units.columns.project")}</th>
                      <th className="py-1 text-right">{t("ops.reports.sold")}</th>
                      <th className="py-1 text-right">{t("ops.reports.meanDays")}</th>
                      <th className="py-1 text-right">{t("ops.reports.median")}</th>
                      <th className="py-1 text-right">{t("ops.reports.p90")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border)]">
                    {velocity.byProject.map((row) => (
                      <tr key={row.projectId}>
                        <td className="py-1.5">{row.projectName}</td>
                        <td className="py-1.5 text-right">{row.soldCount}</td>
                        <td className="py-1.5 text-right">{row.meanDays}</td>
                        <td className="py-1.5 text-right">{row.p50Days}</td>
                        <td className="py-1.5 text-right">{row.p90Days}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{t("ops.reports.byStatus")}</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-[var(--color-foreground-muted)]">
              <tr>
                <th className="py-1">{t("units.columns.project")}</th>
                <th className="py-1">{t("common.statusLabel")}</th>
                <th className="py-1 text-right">{t("ops.reports.count")}</th>
                <th className="py-1 text-right">{t("ops.reports.area")}</th>
                <th className="py-1 text-right">{t("ops.reports.value")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {report.rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-[var(--color-foreground-muted)]">
                    {t("common.noData")}
                  </td>
                </tr>
              ) : (
                report.rows.map((row) => (
                  <tr key={`${row.projectId}-${row.status}`}>
                    <td className="py-1.5">{row.projectName}</td>
                    <td className="py-1.5">{unitStatusLabel(row.status, t)}</td>
                    <td className="py-1.5 text-right">{row.count}</td>
                    <td className="py-1.5 text-right">{row.areaTotal}</td>
                    <td className="py-1.5 text-right">
                      {formatMoney(row.priceTotal, row.currency as SupportedCurrency)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
