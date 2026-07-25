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
import { buildAgencyReport } from "@/server/services/reports/reports.service";
import { formatMoney } from "@/lib/formatters/money";
import type { SupportedCurrency } from "@/lib/constants/app";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AgencyReportPage({ searchParams }: PageProps) {
  const ctx = await requirePermission("report.read");
  if (!ctx.organization) redirect("/dashboard");
  const sp = await searchParams;
  const parsed = parseReportSearchParams(sp);
  const filters = toReportFilters({
    organizationId: ctx.organization.organizationId,
    ...parsed,
  });

  const report = await buildAgencyReport(filters);
  const currency = report.totals.currency as SupportedCurrency;
  const hrefs = exportHrefs("agency", parsed);

  return (
    <div className="space-y-6">
      <PageHeader title="Učinak agencija" description="Aktivnost i provizije po povezanoj agenciji." />

      <ReportFilters
        action="/izvestaji/agencije"
        projects={[]}
        showProjectFilter={false}
        from={parsed.from}
        to={parsed.to}
        exportCsvHref={hrefs.csv}
        exportXlsxHref={hrefs.xlsx}
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Agencija" value={report.totals.agencies} />
        <StatCard label="Prodaja" value={report.totals.salesCount} />
        <StatCard
          label="Vrednost prodaja"
          value={formatMoney(report.totals.salesTotal, currency)}
        />
        <StatCard
          label="Provizije (isplaćeno)"
          value={formatMoney(report.totals.commissionPaid, currency)}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Po agenciji</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-[var(--color-foreground-muted)]">
              <tr>
                <th className="py-1">Agencija</th>
                <th className="py-1 text-right">Rezervacije</th>
                <th className="py-1 text-right">Prodaje</th>
                <th className="py-1 text-right">Vrednost</th>
                <th className="py-1 text-right">Provizija</th>
                <th className="py-1 text-right">Isplaćeno</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {report.rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-4 text-center text-[var(--color-foreground-muted)]">
                    Nema povezanih agencija.
                  </td>
                </tr>
              ) : (
                report.rows.map((row) => (
                  <tr key={row.agencyOrganizationId}>
                    <td className="py-1.5">
                      <Link
                        href={`/agencije/${row.agencyOrganizationId}`}
                        className="text-[var(--color-brand-700)] hover:underline"
                      >
                        {row.agencyName}
                      </Link>
                    </td>
                    <td className="py-1.5 text-right">{row.reservations}</td>
                    <td className="py-1.5 text-right">{row.salesCount}</td>
                    <td className="py-1.5 text-right">
                      {formatMoney(row.salesTotal, row.currency as SupportedCurrency)}
                    </td>
                    <td className="py-1.5 text-right">
                      {formatMoney(row.commissionCalculated, row.currency as SupportedCurrency)}
                    </td>
                    <td className="py-1.5 text-right">
                      {formatMoney(row.commissionPaid, row.currency as SupportedCurrency)}
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
