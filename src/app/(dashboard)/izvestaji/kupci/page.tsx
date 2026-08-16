import { redirect } from "next/navigation";

import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/app/stat-card";
import { ChartCard } from "@/components/charts/chart-card";
import { StatusDonut } from "@/components/charts/status-donut";
import {
  ReportFilters,
  parseReportSearchParams,
  toReportFilters,
  exportHrefs,
} from "@/features/reports/report-filters";
import { requirePermission } from "@/server/permissions/require";
import { buildBuyerPipelineReport } from "@/server/services/reports/reports.service";
import { createT, type TranslationKey } from "@/lib/i18n";
import { resolveRequestLocale } from "@/lib/i18n/resolve-locale";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function BuyersReportPage({ searchParams }: PageProps) {
  const ctx = await requirePermission("report.read");
  if (!ctx.organization) redirect("/dashboard");
  const t = createT(await resolveRequestLocale());
  const sp = await searchParams;
  const parsed = parseReportSearchParams(sp);
  const filters = toReportFilters({
    organizationId: ctx.organization.organizationId,
    ...parsed,
  });

  const report = await buildBuyerPipelineReport(filters);
  const hrefs = exportHrefs("buyers", parsed);

  function statusLabel(status: string) {
    const key = `ops.buyerStatus.${status}` as TranslationKey;
    const out = t(key);
    return out === key ? status : out;
  }

  function sourceLabel(source: string | null) {
    if (!source) return "—";
    const key = `ops.buyerSource.${source}` as TranslationKey;
    const out = t(key);
    return out === key ? source : out;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("ops.reports.buyersPipeline")}
        description={t("ops.reports.buyersDesc")}
      />

      <ReportFilters
        action="/izvestaji/kupci"
        projects={[]}
        showProjectFilter={false}
        from={parsed.from}
        to={parsed.to}
        exportCsvHref={hrefs.csv}
        exportXlsxHref={hrefs.xlsx}
      />

      <div className="grid grid-cols-2 gap-3">
        <StatCard label={t("ops.reports.total")} value={report.totals.buyers} />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <ChartCard
          title={t("ops.reports.byStatus")}
          isEmpty={report.byStatus.length === 0}
          height={240}
        >
          <StatusDonut
            centerLabel={t("ops.reports.buyersCenter")}
            data={report.byStatus.map((row) => ({
              key: row.status,
              label: statusLabel(row.status),
              value: row.count,
            }))}
          />
        </ChartCard>

        <ChartCard
          title={t("ops.reports.bySource")}
          isEmpty={report.bySource.length === 0}
          height={240}
        >
          <StatusDonut
            centerLabel={t("ops.reports.buyersCenter")}
            data={report.bySource.map((row) => ({
              key: row.source,
              label: sourceLabel(row.source),
              value: row.count,
            }))}
          />
        </ChartCard>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t("ops.reports.byStatusDetail")}</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-[var(--color-border)]">
                {report.byStatus.length === 0 ? (
                  <tr>
                    <td className="py-4 text-center text-[var(--color-foreground-muted)]">
                      {t("common.noData")}
                    </td>
                  </tr>
                ) : (
                  report.byStatus.map((row) => (
                    <tr key={row.status}>
                      <td className="py-1.5">{statusLabel(row.status)}</td>
                      <td className="py-1.5 text-right font-medium">{row.count}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t("ops.reports.bySourceDetail")}</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-[var(--color-border)]">
                {report.bySource.length === 0 ? (
                  <tr>
                    <td className="py-4 text-center text-[var(--color-foreground-muted)]">
                      {t("common.noData")}
                    </td>
                  </tr>
                ) : (
                  report.bySource.map((row) => (
                    <tr key={row.source}>
                      <td className="py-1.5">{sourceLabel(row.source)}</td>
                      <td className="py-1.5 text-right font-medium">{row.count}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
