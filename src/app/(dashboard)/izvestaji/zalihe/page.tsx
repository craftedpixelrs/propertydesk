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
import { buildInventoryReport } from "@/server/services/reports/reports.service";
import { formatMoney } from "@/lib/formatters/money";
import type { SupportedCurrency } from "@/lib/constants/app";
import { ChartCard } from "@/components/charts/chart-card";
import { StatusDonut } from "@/components/charts/status-donut";
import { CategoryBars } from "@/components/charts/category-bars";
import { unitStatusColor } from "@/components/charts/palette";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, string> = {
  AVAILABLE: "Dostupno",
  ON_HOLD: "Zadržano",
  RESERVED: "Rezervisano",
  DEPOSIT_PAID: "Kapara",
  CONTRACTED: "Ugovoreno",
  SOLD: "Prodato",
  BLOCKED: "Blokirano",
  NOT_FOR_SALE: "Nije u prodaji",
};

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function InventoryReportPage({ searchParams }: PageProps) {
  const ctx = await requirePermission("report.read");
  if (!ctx.organization) redirect("/dashboard");
  const sp = await searchParams;
  const parsed = parseReportSearchParams(sp);
  const filters = toReportFilters({
    organizationId: ctx.organization.organizationId,
    ...parsed,
  });

  const [report, projects] = await Promise.all([
    buildInventoryReport(filters),
    prisma.project.findMany({
      where: { organizationId: ctx.organization.organizationId, archivedAt: null },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const currency = report.totals.currency as SupportedCurrency;
  const hrefs = exportHrefs("inventory", { projectId: parsed.projectId });

  return (
    <div className="space-y-6">
      <PageHeader title="Zalihe jedinica" description="Struktura inventara po projektu i statusu." />

      <ReportFilters
        action="/izvestaji/zalihe"
        projects={projects}
        selectedProjectId={parsed.projectId}
        exportCsvHref={hrefs.csv}
        exportXlsxHref={hrefs.xlsx}
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Ukupno jedinica" value={report.totals.units} />
        <StatCard label="Površina (m²)" value={report.totals.areaTotal} />
        <StatCard
          label="Vrednost zaliha"
          value={formatMoney(report.totals.priceTotal, currency)}
        />
        <StatCard label="Projekata" value={projects.length} />
      </div>

      {(() => {
        // Aggregate report.rows (project × status) into the two shapes the
        // charts need: (a) donut of total jedinica per status; (b) stacked
        // bar of jedinica per project × status.
        const byStatusMap = new Map<string, number>();
        const projectMap = new Map<string, { name: string; perStatus: Record<string, number> }>();
        for (const row of report.rows) {
          byStatusMap.set(row.status, (byStatusMap.get(row.status) ?? 0) + row.count);
          const bucket = projectMap.get(row.projectId) ?? {
            name: row.projectName,
            perStatus: {},
          };
          bucket.perStatus[row.status] = (bucket.perStatus[row.status] ?? 0) + row.count;
          projectMap.set(row.projectId, bucket);
        }
        const donutData = Array.from(byStatusMap.entries()).map(([status, count]) => ({
          key: status,
          label: STATUS_LABELS[status] ?? status,
          value: count,
          color: unitStatusColor[status],
        }));
        const stackedStatuses = Array.from(byStatusMap.keys());
        const stackedData = Array.from(projectMap.entries()).map(([id, info]) => {
          const datum: Record<string, string | number> = {
            key: id,
            label: info.name,
          };
          for (const s of stackedStatuses) {
            datum[s] = info.perStatus[s] ?? 0;
          }
          return datum as {
            key: string;
            label: string;
            [seriesKey: string]: string | number;
          };
        });
        const stackedSeries = stackedStatuses.map((s) => ({
          key: s,
          label: STATUS_LABELS[s] ?? s,
          color: unitStatusColor[s],
        }));

        return (
          <div className="grid gap-6 lg:grid-cols-2">
            <ChartCard
              title="Raspodela statusa"
              description={`Ukupno ${report.totals.units} jedinica.`}
              isEmpty={donutData.length === 0}
              height={280}
            >
              <StatusDonut centerLabel="Jedinica" data={donutData} />
            </ChartCard>

            <ChartCard
              title="Zalihe po projektu"
              description="Struktura svake grupe."
              isEmpty={stackedData.length === 0}
              height={280}
            >
              <CategoryBars
                data={stackedData}
                series={stackedSeries}
                stacked
                colorPerBar={false}
              />
            </ChartCard>
          </div>
        );
      })()}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Po statusu</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-[var(--color-foreground-muted)]">
              <tr>
                <th className="py-1">Projekat</th>
                <th className="py-1">Status</th>
                <th className="py-1 text-right">Broj</th>
                <th className="py-1 text-right">Površina</th>
                <th className="py-1 text-right">Vrednost</th>
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
                report.rows.map((row) => (
                  <tr key={`${row.projectId}-${row.status}`}>
                    <td className="py-1.5">{row.projectName}</td>
                    <td className="py-1.5">{STATUS_LABELS[row.status] ?? row.status}</td>
                    <td className="py-1.5 text-right">{row.count}</td>
                    <td className="py-1.5 text-right">{row.areaTotal}</td>
                    <td className="py-1.5 text-right">
                      {formatMoney(row.priceTotal, row.currency as SupportedCurrency)}
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
