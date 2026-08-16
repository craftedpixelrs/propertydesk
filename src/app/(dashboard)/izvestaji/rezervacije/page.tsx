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
  buildReservationsReport,
  buildConversionFunnel,
} from "@/server/services/reports/reports.service";
import { formatDate } from "@/lib/formatters/date";
import { ChartCard } from "@/components/charts/chart-card";
import { StatusDonut } from "@/components/charts/status-donut";
import { CategoryBars } from "@/components/charts/category-bars";
import { FunnelBars } from "@/components/charts/funnel-bars";
import { reservationStatusColor } from "@/components/charts/palette";
import { createT, enumLabel, type TranslationKey } from "@/lib/i18n";
import { resolveRequestLocale } from "@/lib/i18n/resolve-locale";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function ReservationsReportPage({ searchParams }: PageProps) {
  const ctx = await requirePermission("report.read");
  if (!ctx.organization) redirect("/dashboard");
  const t = createT(await resolveRequestLocale());
  const sp = await searchParams;
  const parsed = parseReportSearchParams(sp);
  const filters = toReportFilters({
    organizationId: ctx.organization.organizationId,
    ...parsed,
  });

  const [report, funnel, projects] = await Promise.all([
    buildReservationsReport(filters),
    buildConversionFunnel(filters),
    prisma.project.findMany({
      where: { organizationId: ctx.organization.organizationId, archivedAt: null },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const hrefs = exportHrefs("reservations", parsed);
  const conversionPct = Math.round(funnel.overallConversionRate * 100);

  function sourceLabel(source: string) {
    const key = `ops.reservationSource.${source}` as TranslationKey;
    const out = t(key);
    return out === key ? source : out;
  }

  function funnelLabel(key: string) {
    const i18nKey = `ops.reports.funnel.${key}` as TranslationKey;
    const out = t(i18nKey);
    return out === i18nKey ? key : out;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("nav.reservations")}
        description={t("ops.reports.reservationsDesc")}
      />

      <ReportFilters
        action="/izvestaji/rezervacije"
        projects={projects}
        selectedProjectId={parsed.projectId}
        from={parsed.from}
        to={parsed.to}
        exportCsvHref={hrefs.csv}
        exportXlsxHref={hrefs.xlsx}
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label={t("ops.reports.total")} value={report.totals.count} />
        {report.byStatus.slice(0, 3).map((row) => (
          <StatCard
            key={row.status}
            label={enumLabel("reservation", row.status, t)}
            value={row.count}
          />
        ))}
      </div>

      <ChartCard
        title={t("ops.reports.funnelTitle")}
        description={t("ops.reports.funnelDesc", { pct: conversionPct })}
        isEmpty={funnel.steps.every((s) => s.count === 0)}
        height={220}
      >
        <FunnelBars
          data={funnel.steps.map((step) => ({
            key: step.key,
            label: funnelLabel(step.key),
            value: step.count,
          }))}
        />
      </ChartCard>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard
          title={t("ops.reports.byStatus")}
          isEmpty={report.byStatus.length === 0}
          height={240}
        >
          <StatusDonut
            centerLabel={t("ops.reports.total")}
            data={report.byStatus.map((row) => ({
              key: row.status,
              label: enumLabel("reservation", row.status, t),
              value: row.count,
              color: reservationStatusColor[row.status],
            }))}
          />
        </ChartCard>

        <ChartCard
          title={t("ops.reports.bySource")}
          isEmpty={report.bySource.length === 0}
          height={240}
        >
          <CategoryBars
            data={report.bySource.map((row) => ({
              key: row.source,
              label: sourceLabel(row.source),
              value: row.count,
            }))}
          />
        </ChartCard>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{t("nav.reservations")}</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-[var(--color-foreground-muted)]">
              <tr>
                <th className="py-1">{t("common.date")}</th>
                <th className="py-1">{t("units.columns.project")}</th>
                <th className="py-1">{t("partners.unit")}</th>
                <th className="py-1">{t("partners.buyer")}</th>
                <th className="py-1">{t("ops.reports.source")}</th>
                <th className="py-1">{t("common.statusLabel")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {report.rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-4 text-center text-[var(--color-foreground-muted)]">
                    {t("common.noData")}
                  </td>
                </tr>
              ) : (
                report.rows.map((r) => (
                  <tr key={r.id}>
                    <td className="py-1.5">{formatDate(r.createdAt)}</td>
                    <td className="py-1.5">{r.projectName}</td>
                    <td className="py-1.5">{r.unitCode}</td>
                    <td className="py-1.5">{r.buyerName}</td>
                    <td className="py-1.5">{sourceLabel(r.source)}</td>
                    <td className="py-1.5">{enumLabel("reservation", r.status, t)}</td>
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
