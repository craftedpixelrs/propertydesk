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
import { buildReservationsReport } from "@/server/services/reports/reports.service";
import { formatDate } from "@/lib/formatters/date";

export const dynamic = "force-dynamic";

const RES_LABELS: Record<string, string> = {
  REQUESTED: "Na čekanju",
  APPROVED: "Odobrena",
  REJECTED: "Odbijena",
  EXPIRED: "Istekla",
  CANCELED: "Otkazana",
  CONVERTED: "Prodaja",
};

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function ReservationsReportPage({ searchParams }: PageProps) {
  const ctx = await requirePermission("report.read");
  if (!ctx.organization) redirect("/dashboard");
  const sp = await searchParams;
  const parsed = parseReportSearchParams(sp);
  const filters = toReportFilters({
    organizationId: ctx.organization.organizationId,
    ...parsed,
  });

  const [report, projects] = await Promise.all([
    buildReservationsReport(filters),
    prisma.project.findMany({
      where: { organizationId: ctx.organization.organizationId, archivedAt: null },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const hrefs = exportHrefs("reservations", parsed);

  return (
    <div className="space-y-6">
      <PageHeader title="Rezervacije" description="Struktura rezervacija po statusu i izvoru." />

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
        <StatCard label="Ukupno" value={report.totals.count} />
        {report.byStatus.slice(0, 3).map((row) => (
          <StatCard key={row.status} label={RES_LABELS[row.status] ?? row.status} value={row.count} />
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Rezervacije</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-[var(--color-foreground-muted)]">
              <tr>
                <th className="py-1">Datum</th>
                <th className="py-1">Projekat</th>
                <th className="py-1">Jedinica</th>
                <th className="py-1">Kupac</th>
                <th className="py-1">Izvor</th>
                <th className="py-1">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {report.rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-4 text-center text-[var(--color-foreground-muted)]">
                    Nema podataka.
                  </td>
                </tr>
              ) : (
                report.rows.map((r) => (
                  <tr key={r.id}>
                    <td className="py-1.5">{formatDate(r.createdAt)}</td>
                    <td className="py-1.5">{r.projectName}</td>
                    <td className="py-1.5">{r.unitCode}</td>
                    <td className="py-1.5">{r.buyerName}</td>
                    <td className="py-1.5">{r.source}</td>
                    <td className="py-1.5">{RES_LABELS[r.status] ?? r.status}</td>
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
