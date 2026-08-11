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

export const dynamic = "force-dynamic";

const METHOD_LABELS: Record<string, string> = {
  BANK_TRANSFER: "Nalog",
  CASH: "Gotovina",
  CARD: "Kartica",
  CHECK: "Ček",
  OTHER: "Ostalo",
};

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function PaymentsReportPage({ searchParams }: PageProps) {
  const ctx = await requirePermission("report.read");
  if (!ctx.organization) redirect("/dashboard");
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

  return (
    <div className="space-y-6">
      <PageHeader title="Uplate" description="Kretanje uplata po datumu i metodi plaćanja." />

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
        <StatCard label="Broj uplata" value={report.totals.count} />
        <StatCard label="Aktivno" value={formatMoney(report.totals.activeTotal, currency)} />
        <StatCard label="Stornirano" value={formatMoney(report.totals.reversedTotal, currency)} />
      </div>

      <CashFlowCard
        projection={cashflow}
        title="Cash-flow projekcija (12 meseci)"
        description="Očekivane naplate po planovima plaćanja i stvarni prilivi iz uplata — sve u jednoj slici."
      />


      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard
          title="Broj uplata po metodi"
          isEmpty={report.byMethod.length === 0}
          height={240}
        >
          <CategoryBars
            data={report.byMethod.map((row) => ({
              key: row.method,
              label: METHOD_LABELS[row.method] ?? row.method,
              value: row.count,
            }))}
          />
        </ChartCard>
        <ChartCard
          title={`Iznosi po metodi (${currency})`}
          isEmpty={report.byMethod.length === 0}
          height={240}
        >
          <CategoryBars
            yTickFormat="compact"
            data={report.byMethod.map((row) => ({
              key: row.method,
              label: METHOD_LABELS[row.method] ?? row.method,
              value: Number(row.total),
            }))}
          />
        </ChartCard>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Po metodi</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-[var(--color-foreground-muted)]">
              <tr>
                <th className="py-1">Metoda</th>
                <th className="py-1 text-right">Broj</th>
                <th className="py-1 text-right">Iznos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {report.byMethod.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-4 text-center text-[var(--color-foreground-muted)]">
                    Nema podataka.
                  </td>
                </tr>
              ) : (
                report.byMethod.map((row) => (
                  <tr key={row.method}>
                    <td className="py-1.5">{METHOD_LABELS[row.method] ?? row.method}</td>
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
          <CardTitle className="text-sm">Detaljno</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-[var(--color-foreground-muted)]">
              <tr>
                <th className="py-1">Datum</th>
                <th className="py-1">Jedinica</th>
                <th className="py-1 text-right">Iznos</th>
                <th className="py-1">Metoda</th>
                <th className="py-1">Storno</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {report.rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-[var(--color-foreground-muted)]">
                    Nema podataka.
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
                    <td className="py-1.5">{METHOD_LABELS[p.method] ?? p.method}</td>
                    <td className="py-1.5">{p.reversed ? "Da" : "—"}</td>
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
