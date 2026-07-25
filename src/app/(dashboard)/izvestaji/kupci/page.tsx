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
import { buildBuyerPipelineReport } from "@/server/services/reports/reports.service";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, string> = {
  NEW: "Novi",
  CONTACTED: "Kontaktiran",
  QUALIFIED: "Kvalifikovan",
  PROPOSAL: "Ponuda",
  NEGOTIATION: "Pregovori",
  RESERVATION: "Rezervacija",
  SALE: "Prodaja",
  LOST: "Izgubljen",
  ARCHIVED: "Arhiviran",
};

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function BuyersReportPage({ searchParams }: PageProps) {
  const ctx = await requirePermission("report.read");
  if (!ctx.organization) redirect("/dashboard");
  const sp = await searchParams;
  const parsed = parseReportSearchParams(sp);
  const filters = toReportFilters({
    organizationId: ctx.organization.organizationId,
    ...parsed,
  });

  const report = await buildBuyerPipelineReport(filters);
  const hrefs = exportHrefs("buyers", parsed);

  return (
    <div className="space-y-6">
      <PageHeader title="Kupci — pipeline" description="Broj kupaca po statusu i izvoru." />

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
        <StatCard label="Ukupno" value={report.totals.buyers} />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Po statusu</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-[var(--color-border)]">
                {report.byStatus.length === 0 ? (
                  <tr>
                    <td className="py-4 text-center text-[var(--color-foreground-muted)]">
                      Nema podataka.
                    </td>
                  </tr>
                ) : (
                  report.byStatus.map((row) => (
                    <tr key={row.status}>
                      <td className="py-1.5">{STATUS_LABELS[row.status] ?? row.status}</td>
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
            <CardTitle className="text-sm">Po izvoru</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-[var(--color-border)]">
                {report.bySource.length === 0 ? (
                  <tr>
                    <td className="py-4 text-center text-[var(--color-foreground-muted)]">
                      Nema podataka.
                    </td>
                  </tr>
                ) : (
                  report.bySource.map((row) => (
                    <tr key={row.source}>
                      <td className="py-1.5">{row.source || "—"}</td>
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
