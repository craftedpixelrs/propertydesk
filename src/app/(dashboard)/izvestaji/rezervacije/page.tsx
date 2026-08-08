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

const SOURCE_LABELS: Record<string, string> = {
  DIRECT: "Direktno",
  AGENCY: "Agencija",
  IMPORT: "Uvoz",
  OTHER: "Ostalo",
};

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

      <ChartCard
        title="Lievak konverzije"
        description={`Ukupan udeo prodaje u odnosu na sve rezervacije: ${conversionPct}%.`}
        isEmpty={funnel.steps.every((s) => s.count === 0)}
        height={220}
      >
        <FunnelBars
          data={funnel.steps.map((step) => ({
            key: step.key,
            label: step.label,
            value: step.count,
          }))}
        />
      </ChartCard>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard
          title="Po statusu"
          isEmpty={report.byStatus.length === 0}
          height={240}
        >
          <StatusDonut
            centerLabel="Ukupno"
            data={report.byStatus.map((row) => ({
              key: row.status,
              label: RES_LABELS[row.status] ?? row.status,
              value: row.count,
              color: reservationStatusColor[row.status],
            }))}
          />
        </ChartCard>

        <ChartCard
          title="Po izvoru"
          isEmpty={report.bySource.length === 0}
          height={240}
        >
          <CategoryBars
            data={report.bySource.map((row) => ({
              key: row.source,
              label: SOURCE_LABELS[row.source] ?? row.source,
              value: row.count,
            }))}
          />
        </ChartCard>
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
