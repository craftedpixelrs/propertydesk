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
import { prisma } from "@/server/db/prisma";
import { buildSalesReport } from "@/server/services/reports/reports.service";
import { formatDate, formatMoney } from "@/lib/formatters";
import type { SupportedCurrency } from "@/lib/constants/app";

export const dynamic = "force-dynamic";

const SALE_LABELS: Record<string, string> = {
  DRAFT: "Nacrt",
  PRE_CONTRACT: "Predugovor",
  CONTRACTED: "Ugovorena",
  PAYMENT_IN_PROGRESS: "Plaćanje u toku",
  PAID: "Plaćena",
  HANDED_OVER: "Primopredato",
  CANCELED: "Otkazana",
};

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function SalesReportPage({ searchParams }: PageProps) {
  const ctx = await requirePermission("report.read");
  if (!ctx.organization) redirect("/dashboard");
  const sp = await searchParams;
  const parsed = parseReportSearchParams(sp);
  const filters = toReportFilters({
    organizationId: ctx.organization.organizationId,
    ...parsed,
  });

  const [report, projects] = await Promise.all([
    buildSalesReport(filters),
    prisma.project.findMany({
      where: { organizationId: ctx.organization.organizationId, archivedAt: null },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const currency = report.totals.currency as SupportedCurrency;
  const hrefs = exportHrefs("sales", parsed);

  return (
    <div className="space-y-6">
      <PageHeader title="Prodaje" description="Realizovane prodaje sa naplatom po jedinici." />

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
        <StatCard label="Prodaja" value={report.totals.count} />
        <StatCard label="Ugovoreno" value={formatMoney(report.totals.finalPriceTotal, currency)} />
        <StatCard label="Naplaćeno" value={formatMoney(report.totals.paidTotal, currency)} />
        <StatCard label="Preostalo" value={formatMoney(report.totals.outstandingTotal, currency)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Prodaje</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-[var(--color-foreground-muted)]">
              <tr>
                <th className="py-1">Datum</th>
                <th className="py-1">Jedinica</th>
                <th className="py-1">Kupac</th>
                <th className="py-1">Agencija</th>
                <th className="py-1">Status</th>
                <th className="py-1 text-right">Cena</th>
                <th className="py-1 text-right">Uplaćeno</th>
                <th className="py-1 text-right">Preostalo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {report.rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-4 text-center text-[var(--color-foreground-muted)]">
                    Nema podataka.
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
                    <td className="py-1.5">{SALE_LABELS[r.status] ?? r.status}</td>
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
