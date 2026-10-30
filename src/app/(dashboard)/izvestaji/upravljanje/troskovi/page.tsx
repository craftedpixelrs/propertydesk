import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { StatCard } from "@/components/app/stat-card";
import { Button } from "@/components/ui/button";
import { loadUserContext, requireTenantPage } from "@/server/auth/context";
import { buildManagerExpensesReport } from "@/server/services/manager/reports.service";
import { prisma } from "@/server/db/prisma";
import { formatMoney } from "@/lib/formatters";
import { createT } from "@/lib/i18n";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function ManagerExpensesReport({ searchParams }: PageProps) {
  const ctx = await loadUserContext();
  requireTenantPage(ctx, { permission: "report.read", orgType: "MANAGER" });
  const t = createT(ctx.user.locale);

  const sp = await searchParams;
  const now = new Date();
  const yearRaw = typeof sp.year === "string" ? parseInt(sp.year, 10) : now.getFullYear();
  const year = Number.isFinite(yearRaw) ? yearRaw : now.getFullYear();
  const buildingId = typeof sp.buildingId === "string" && sp.buildingId ? sp.buildingId : null;

  const from = new Date(Date.UTC(year, 0, 1));
  const to = new Date(Date.UTC(year + 1, 0, 1));

  const [report, buildings] = await Promise.all([
    buildManagerExpensesReport({
      organizationId: ctx.activeOrganization.id,
      from,
      to,
      buildingId,
    }),
    prisma.managedBuilding.findMany({
      where: { organizationId: ctx.activeOrganization.id, archivedAt: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const exportCsv = new URLSearchParams({
    report: "manager-expenses",
    format: "csv",
    year: String(year),
    ...(buildingId ? { buildingId } : {}),
  }).toString();
  const exportXlsx = new URLSearchParams({
    report: "manager-expenses",
    format: "xlsx",
    year: String(year),
    ...(buildingId ? { buildingId } : {}),
  }).toString();

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("manager.reports.expensesTitle")}
        description={t("manager.reports.expensesDesc")}
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
        {report.byFund.map((f) => (
          <StatCard
            key={f.fund}
            label={t(`manager.reports.expenseFund.${f.fund}` as const)}
            value={formatMoney(f.total, "RSD")}
            hint={`${f.count}`}
          />
        ))}
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
                <th className="px-4 py-3">Fond</th>
                <th className="px-4 py-3 text-right">{t("manager.reports.outstanding")}</th>
                <th className="px-4 py-3 text-right">#</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {report.rows.map((r) => (
                <tr
                  key={`${r.buildingId}-${r.fund}`}
                  className="hover:bg-[var(--color-surface-inset)]"
                >
                  <td className="px-4 py-3">{r.buildingName}</td>
                  <td className="px-4 py-3">
                    {t(`manager.reports.expenseFund.${r.fund}` as const)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono">{formatMoney(r.total, "RSD")}</td>
                  <td className="px-4 py-3 text-right text-xs text-[var(--color-foreground-muted)]">
                    {r.count}
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
