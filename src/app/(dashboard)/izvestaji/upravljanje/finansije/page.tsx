import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { StatCard } from "@/components/app/stat-card";
import { Button } from "@/components/ui/button";
import { loadUserContext, requireTenantPage } from "@/server/auth/context";
import { buildManagerFinancialReport } from "@/server/services/manager/reports.service";
import { prisma } from "@/server/db/prisma";
import { formatMoney } from "@/lib/formatters";
import { createT } from "@/lib/i18n";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function ManagerFinancialReport({ searchParams }: PageProps) {
  const ctx = await loadUserContext();
  requireTenantPage(ctx, { permission: "report.read", orgType: "MANAGER" });
  const t = createT(ctx.user.locale);

  const sp = await searchParams;
  const now = new Date();
  const yearRaw = typeof sp.year === "string" ? parseInt(sp.year, 10) : now.getFullYear();
  const year = Number.isFinite(yearRaw) ? yearRaw : now.getFullYear();
  const monthRaw = typeof sp.month === "string" && sp.month ? parseInt(sp.month, 10) : null;
  const month = monthRaw && monthRaw >= 1 && monthRaw <= 12 ? monthRaw : null;
  const buildingId = typeof sp.buildingId === "string" && sp.buildingId ? sp.buildingId : null;

  const [report, buildings] = await Promise.all([
    buildManagerFinancialReport({
      organizationId: ctx.activeOrganization.id,
      year,
      month,
      buildingId,
    }),
    prisma.managedBuilding.findMany({
      where: { organizationId: ctx.activeOrganization.id, archivedAt: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const exportCsv = new URLSearchParams({
    report: "manager-financial",
    format: "csv",
    year: String(year),
    ...(month ? { month: String(month) } : {}),
    ...(buildingId ? { buildingId } : {}),
  }).toString();
  const exportXlsx = new URLSearchParams({
    report: "manager-financial",
    format: "xlsx",
    year: String(year),
    ...(month ? { month: String(month) } : {}),
    ...(buildingId ? { buildingId } : {}),
  }).toString();

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("manager.reports.financialTitle")}
        description={t("manager.reports.financialDesc")}
      />

      <form
        method="GET"
        className="flex flex-wrap items-end gap-3 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-3"
      >
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-[var(--color-foreground-muted)]">{t("manager.reports.year")}</span>
          <input
            name="year"
            type="number"
            defaultValue={year}
            className="h-9 w-28 rounded-md border border-[var(--color-border)] bg-white px-3 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-[var(--color-foreground-muted)]">{t("manager.reports.month")}</span>
          <select
            name="month"
            defaultValue={month ?? ""}
            className="h-9 w-32 rounded-md border border-[var(--color-border)] bg-white px-2 text-sm"
          >
            <option value="">—</option>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>
                {String(m).padStart(2, "0")}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-[var(--color-foreground-muted)]">
            {t("manager.reports.building")}
          </span>
          <select
            name="buildingId"
            defaultValue={buildingId ?? ""}
            className="h-9 min-w-[12rem] rounded-md border border-[var(--color-border)] bg-white px-2 text-sm"
          >
            <option value="">{t("manager.reports.allBuildings")}</option>
            {buildings.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
        <Button type="submit" variant="outline" size="sm">
          {t("common.open")}
        </Button>
        <div className="ml-auto flex gap-2">
          <Button asChild variant="outline" size="sm">
            <a href={`/api/v1/manager/reports/export?${exportCsv}`}>
              {t("manager.reports.exportCsv")}
            </a>
          </Button>
          <Button asChild variant="outline" size="sm">
            <a href={`/api/v1/manager/reports/export?${exportXlsx}`}>
              {t("manager.reports.exportXlsx")}
            </a>
          </Button>
        </div>
      </form>

      <div className="grid gap-3 md:grid-cols-3">
        <StatCard
          label={t("manager.reports.totalCharged")}
          value={formatMoney(report.totals.chargedTotal, "RSD")}
          hint={`${report.totals.chargesCount} zaduženja`}
        />
        <StatCard
          label={t("manager.reports.totalCollected")}
          value={formatMoney(report.totals.paidTotal, "RSD")}
        />
        <StatCard
          label={t("manager.reports.outstanding")}
          value={formatMoney(report.totals.outstanding, "RSD")}
        />
      </div>

      {report.rows.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-[var(--color-foreground-muted)]">
            —
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-md border border-[var(--color-border)] bg-[var(--color-surface)]">
          <table className="min-w-full divide-y divide-[var(--color-border)] text-sm">
            <thead className="bg-[var(--color-surface-inset)] text-left text-xs tracking-wide text-[var(--color-foreground-muted)] uppercase">
              <tr>
                <th className="px-4 py-3">{t("manager.reports.building")}</th>
                <th className="px-4 py-3 text-right">{t("manager.reports.totalCharged")}</th>
                <th className="px-4 py-3 text-right">{t("manager.reports.totalCollected")}</th>
                <th className="px-4 py-3 text-right">{t("manager.reports.outstanding")}</th>
                <th className="px-4 py-3 text-right">#</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {report.rows.map((r) => (
                <tr key={r.buildingId} className="hover:bg-[var(--color-surface-inset)]">
                  <td className="px-4 py-3">{r.buildingName}</td>
                  <td className="px-4 py-3 text-right font-mono">
                    {formatMoney(r.chargedTotal, "RSD")}
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    {formatMoney(r.paidTotal, "RSD")}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-medium">
                    {formatMoney(r.outstanding, "RSD")}
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-[var(--color-foreground-muted)]">
                    {r.chargesCount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
