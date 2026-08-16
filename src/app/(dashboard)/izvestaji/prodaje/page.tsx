import Link from "next/link";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/app/stat-card";
import { ChartCard } from "@/components/charts/chart-card";
import { StatusDonut } from "@/components/charts/status-donut";
import { CategoryBars } from "@/components/charts/category-bars";
import { saleStatusColor } from "@/components/charts/palette";
import {
  ReportFilters,
  parseReportSearchParams,
  toReportFilters,
  exportHrefs,
} from "@/features/reports/report-filters";
import { requirePermission } from "@/server/permissions/require";
import { prisma } from "@/server/db/prisma";
import {
  buildSalesReport,
  buildSalesTrend,
} from "@/server/services/reports/reports.service";
import { computeProjectPnl } from "@/server/services/projects/pnl.service";
import { TrendLine } from "@/components/charts/trend-line";
import { formatDate, formatMoney } from "@/lib/formatters";
import type { SupportedCurrency } from "@/lib/constants/app";
import { createT, enumLabel, type TranslateFn } from "@/lib/i18n";
import { resolveRequestLocale } from "@/lib/i18n/resolve-locale";

export const dynamic = "force-dynamic";

function saleLabel(status: string, t: TranslateFn) {
  return enumLabel("sale", status === "PRE_CONTRACT" ? "PRECONTRACT" : status, t);
}

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function SalesReportPage({ searchParams }: PageProps) {
  const ctx = await requirePermission("report.read");
  if (!ctx.organization) redirect("/dashboard");
  const t = createT(await resolveRequestLocale());
  const sp = await searchParams;
  const parsed = parseReportSearchParams(sp);
  const filters = toReportFilters({
    organizationId: ctx.organization.organizationId,
    ...parsed,
  });

  const [report, trend, projects, pnl] = await Promise.all([
    buildSalesReport(filters),
    buildSalesTrend(filters),
    prisma.project.findMany({
      where: { organizationId: ctx.organization.organizationId, archivedAt: null },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    computeProjectPnl({
      organizationId: ctx.organization.organizationId,
      projectId: parsed.projectId,
    }),
  ]);

  const currency = report.totals.currency as SupportedCurrency;
  const hrefs = exportHrefs("sales", parsed);

  // Merge trend points into one row per bucket for Recharts. Each currency
  // becomes its own line and its own numeric key on the row.
  const trendBucketLabels = Array.from(
    new Set(trend.points.map((p) => p.bucketLabel)),
  ).sort();
  const trendData = trendBucketLabels.map((label) => {
    const row: { key: string; label: string; [k: string]: number | string } = {
      key: label,
      label,
    };
    for (const currencyCode of trend.currencies) {
      row[`${currencyCode}_total`] = 0;
      row[`${currencyCode}_count`] = 0;
    }
    for (const point of trend.points) {
      if (point.bucketLabel !== label) continue;
      row[`${point.currency}_total`] = Number(point.salesTotal);
      row[`${point.currency}_count`] = point.salesCount;
    }
    return row;
  });
  const trendSeries = trend.currencies.map((c) => ({
    key: `${c}_total`,
    label: t("ops.reports.contractedCurrency", { currency: c }),
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("nav.sales")}
        description={t("ops.reports.salesDesc")}
      />

      <ReportFilters
        action="/izvestaji/prodaje"
        projects={projects}
        selectedProjectId={parsed.projectId}
        from={parsed.from}
        to={parsed.to}
        exportCsvHref={hrefs.csv}
        exportXlsxHref={hrefs.xlsx}
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label={t("ops.reports.salesCount")} value={report.totals.count} />
        <StatCard
          label={t("ops.reports.contracted")}
          value={formatMoney(report.totals.finalPriceTotal, currency)}
        />
        <StatCard
          label={t("ops.reports.collected")}
          value={formatMoney(report.totals.paidTotal, currency)}
        />
        <StatCard
          label={t("ops.reports.outstanding")}
          value={formatMoney(report.totals.outstandingTotal, currency)}
        />
      </div>

      <ChartCard
        title={t("ops.reports.monthlyValue")}
        description={t("ops.reports.monthlyValueDesc")}
        isEmpty={trendData.length === 0}
        height={280}
      >
        <TrendLine
          buckets={trendData}
          series={trendSeries}
          yTickFormat="compact"
        />
      </ChartCard>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard
          title={t("ops.reports.salesByStatus")}
          description={t("ops.reports.salesByStatusHint")}
          isEmpty={report.byStatus.length === 0}
          height={240}
        >
          <StatusDonut
            centerLabel={t("ops.reports.salesCenter")}
            data={report.byStatus.map((row) => ({
              key: row.status,
              label: saleLabel(row.status, t),
              value: row.count,
              color: saleStatusColor[row.status],
            }))}
          />
        </ChartCard>

        <ChartCard
          title={t("ops.reports.valueByStatus")}
          description={t("ops.reports.valueByStatusHint", { currency })}
          isEmpty={report.byStatus.length === 0}
          height={240}
        >
          <CategoryBars
            yTickFormat="compact"
            data={report.byStatus.map((row) => ({
              key: row.status,
              label: saleLabel(row.status, t),
              value: Number(row.finalPriceTotal),
              color: saleStatusColor[row.status],
            }))}
          />
        </ChartCard>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{t("ops.reports.marginTitle")}</CardTitle>
          <p className="text-xs text-[var(--color-foreground-muted)]">
            {t("ops.reports.marginHint")}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {pnl.summaries.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {pnl.summaries.map((s) => (
                <div
                  key={s.currency}
                  className="rounded-md border border-[var(--color-border)] p-3"
                >
                  <div className="text-xs text-[var(--color-foreground-muted)]">
                    {t("ops.reports.netCurrency", { currency: s.currency })}
                  </div>
                  <div
                    className={`mt-1 text-lg font-semibold ${
                      Number(s.netMargin) >= 0 ? "text-emerald-700" : "text-rose-700"
                    }`}
                  >
                    {formatMoney(s.netMargin, s.currency as SupportedCurrency)}
                  </div>
                  <div className="mt-1 text-xs text-[var(--color-foreground-muted)]">
                    {t("ops.reports.revenueCost", {
                      revenue: formatMoney(s.revenueTotal, s.currency as SupportedCurrency),
                      cost: formatMoney(s.costTotal, s.currency as SupportedCurrency),
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
          {pnl.rows.length === 0 ? (
            <p className="rounded-md border border-dashed border-[var(--color-border)] p-6 text-center text-sm text-[var(--color-foreground-muted)]">
              {t("ops.reports.noActiveProjects")}
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-[var(--color-foreground-muted)]">
                <tr>
                  <th className="py-1">{t("units.columns.project")}</th>
                  <th className="py-1 text-right">{t("ops.reports.salesCol")}</th>
                  <th className="py-1 text-right">{t("ops.reports.revenue")}</th>
                  <th className="py-1 text-right">{t("ops.reports.land")}</th>
                  <th className="py-1 text-right">{t("ops.reports.construction")}</th>
                  <th className="py-1 text-right">{t("ops.reports.marketing")}</th>
                  <th className="py-1 text-right">{t("ops.reports.other")}</th>
                  <th className="py-1 text-right">{t("ops.reports.commission")}</th>
                  <th className="py-1 text-right">{t("ops.reports.net")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {pnl.rows.map((r) => (
                  <tr key={r.projectId}>
                    <td className="py-1.5">
                      <Link
                        href={`/projekti/${r.projectId}`}
                        className="text-[var(--color-brand-700)] hover:underline"
                      >
                        {r.projectName}
                      </Link>
                      {!r.hasCosts ? (
                        <span className="ml-1 text-[10px] text-amber-700">
                          {t("ops.reports.noCosts")}
                        </span>
                      ) : null}
                    </td>
                    <td className="py-1.5 text-right">{r.salesCount}</td>
                    <td className="py-1.5 text-right">
                      {formatMoney(r.revenue, r.currency as SupportedCurrency)}
                    </td>
                    <td className="py-1.5 text-right">
                      {formatMoney(r.landCost, r.currency as SupportedCurrency)}
                    </td>
                    <td className="py-1.5 text-right">
                      {formatMoney(r.constructionCost, r.currency as SupportedCurrency)}
                    </td>
                    <td className="py-1.5 text-right">
                      {formatMoney(r.marketingCost, r.currency as SupportedCurrency)}
                    </td>
                    <td className="py-1.5 text-right">
                      {formatMoney(r.otherCost, r.currency as SupportedCurrency)}
                    </td>
                    <td className="py-1.5 text-right">
                      {formatMoney(r.commissionCost, r.currency as SupportedCurrency)}
                    </td>
                    <td
                      className={`py-1.5 text-right font-semibold ${
                        Number(r.netMargin) >= 0
                          ? "text-emerald-700"
                          : "text-rose-700"
                      }`}
                    >
                      {formatMoney(r.netMargin, r.currency as SupportedCurrency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{t("nav.sales")}</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-[var(--color-foreground-muted)]">
              <tr>
                <th className="py-1">{t("common.date")}</th>
                <th className="py-1">{t("partners.unit")}</th>
                <th className="py-1">{t("partners.buyer")}</th>
                <th className="py-1">{t("nav.agencies")}</th>
                <th className="py-1">{t("common.statusLabel")}</th>
                <th className="py-1 text-right">{t("ops.reports.price")}</th>
                <th className="py-1 text-right">{t("ops.reports.paid")}</th>
                <th className="py-1 text-right">{t("ops.reports.outstanding")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {report.rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-4 text-center text-[var(--color-foreground-muted)]">
                    {t("common.noData")}
                  </td>
                </tr>
              ) : (
                report.rows.map((r) => (
                  <tr key={r.id}>
                    <td className="py-1.5">{formatDate(r.createdAt)}</td>
                    <td className="py-1.5">
                      <Link
                        href={`/prodaje/${r.id}`}
                        className="text-[var(--color-brand-700)] hover:underline"
                      >
                        {r.unitCode}
                      </Link>
                    </td>
                    <td className="py-1.5">{r.buyerName}</td>
                    <td className="py-1.5">{r.agencyName ?? "—"}</td>
                    <td className="py-1.5">{saleLabel(r.status, t)}</td>
                    <td className="py-1.5 text-right">
                      {formatMoney(r.finalPrice, r.currency as SupportedCurrency)}
                    </td>
                    <td className="py-1.5 text-right">
                      {formatMoney(r.paid, r.currency as SupportedCurrency)}
                    </td>
                    <td className="py-1.5 text-right">
                      {formatMoney(r.outstanding, r.currency as SupportedCurrency)}
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
