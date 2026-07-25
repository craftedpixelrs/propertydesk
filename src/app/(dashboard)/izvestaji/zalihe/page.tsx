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
