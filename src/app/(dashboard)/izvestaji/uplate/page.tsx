import Link from "next/link";
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
import { buildPaymentsReport } from "@/server/services/reports/reports.service";
import { buildCashFlowProjection } from "@/server/services/reports/cash-flow.service";
import { CashFlowCard } from "@/features/reports/cash-flow-card";
import { formatDate, formatMoney } from "@/lib/formatters";
import type { SupportedCurrency } from "@/lib/constants/app";
import { ChartCard } from "@/components/charts/chart-card";
import { CategoryBars } from "@/components/charts/category-bars";
import { createT, type TranslationKey } from "@/lib/i18n";
import { resolveRequestLocale } from "@/lib/i18n/resolve-locale";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function PaymentsReportPage({ searchParams }: PageProps) {
  const ctx = await requirePermission("report.read");
  if (!ctx.organization) redirect("/dashboard");
  const t = createT(await resolveRequestLocale());
  const sp = await searchParams;
  const parsed = parseReportSearchParams(sp);
  const filters = toReportFilters({
    organizationId: ctx.organization.organizationId,
    ...parsed,
  });

  const [report, cashflow] = await Promise.all([
    buildPaymentsReport(filters),
    buildCashFlowProjection({
      organizationId: ctx.organization.organizationId,
      projectId: filters.projectId ?? null,
      months: 12,
    }),
  ]);
  const currency = report.totals.currency as SupportedCurrency;
  const hrefs = exportHrefs("payments", parsed);

  function methodLabel(method: string) {
    const key = `ops.paymentMethod.${method}` as TranslationKey;
    const out = t(key);
    return out === key ? method : out;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("nav.payments")}
        description={t("ops.reports.paymentsDesc")}
      />

      <ReportFilters
        action="/izvestaji/uplate"
        projects={[]}
        showProjectFilter={false}
        from={parsed.from}
        to={parsed.to}
        exportCsvHref={hrefs.csv}
        exportXlsxHref={hrefs.xlsx}
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <StatCard label={t("ops.reports.paymentCount")} value={report.totals.count} />
        <StatCard
          label={t("ops.reports.active")}
          value={formatMoney(report.totals.activeTotal, currency)}
        />
        <StatCard
          label={t("ops.reports.reversedTotal")}
          value={formatMoney(report.totals.reversedTotal, currency)}
        />
      </div>

      <CashFlowCard
        projection={cashflow}
        title={t("ops.reports.cashFlowTitle")}
        description={t("ops.reports.cashFlowDesc")}
      />


      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard
          title={t("ops.reports.countByMethod")}
          isEmpty={report.byMethod.length === 0}
          height={240}
        >
          <CategoryBars
            data={report.byMethod.map((row) => ({
              key: row.method,
              label: methodLabel(row.method),
              value: row.count,
            }))}
          />
        </ChartCard>
        <ChartCard
          title={t("ops.reports.amountsByMethod", { currency })}
          isEmpty={report.byMethod.length === 0}
          height={240}
        >
          <CategoryBars
            yTickFormat="compact"
            data={report.byMethod.map((row) => ({
              key: row.method,
              label: methodLabel(row.method),
              value: Number(row.total),
            }))}
          />
        </ChartCard>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{t("ops.reports.byMethod")}</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-[var(--color-foreground-muted)]">
              <tr>
                <th className="py-1">{t("ops.reports.method")}</th>
                <th className="py-1 text-right">{t("ops.reports.count")}</th>
                <th className="py-1 text-right">{t("common.amount")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {report.byMethod.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-4 text-center text-[var(--color-foreground-muted)]">
                    {t("common.noData")}
                  </td>
                </tr>
              ) : (
                report.byMethod.map((row) => (
                  <tr key={row.method}>
                    <td className="py-1.5">{methodLabel(row.method)}</td>
                    <td className="py-1.5 text-right">{row.count}</td>
                    <td className="py-1.5 text-right">{formatMoney(row.total, currency)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{t("common.details")}</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-[var(--color-foreground-muted)]">
              <tr>
                <th className="py-1">{t("common.date")}</th>
                <th className="py-1">{t("partners.unit")}</th>
                <th className="py-1 text-right">{t("common.amount")}</th>
                <th className="py-1">{t("ops.reports.method")}</th>
                <th className="py-1">{t("ops.reports.reversed")}</th>
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
                report.rows.map((p) => (
                  <tr key={p.id} className={p.reversed ? "opacity-50" : ""}>
                    <td className="py-1.5">{formatDate(p.paymentDate)}</td>
                    <td className="py-1.5">
                      <Link
                        href={`/prodaje/${p.saleId}`}
                        className="text-[var(--color-brand-700)] hover:underline"
                      >
                        {p.unitCode}
                      </Link>
                    </td>
                    <td className="py-1.5 text-right">
                      {formatMoney(p.amount, p.currency as SupportedCurrency)}
                    </td>
                    <td className="py-1.5">{methodLabel(p.method)}</td>
                    <td className="py-1.5">{p.reversed ? t("common.yes") : "—"}</td>
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
