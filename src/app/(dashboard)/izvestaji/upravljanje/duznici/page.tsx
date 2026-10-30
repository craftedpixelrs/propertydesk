import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { loadUserContext, requireTenantPage } from "@/server/auth/context";
import { listDebtors } from "@/server/services/manager/dues.service";
import { prisma } from "@/server/db/prisma";
import { formatDate, formatMoney } from "@/lib/formatters";
import { createT } from "@/lib/i18n";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function ManagerDebtorsReport({ searchParams }: PageProps) {
  const ctx = await loadUserContext();
  requireTenantPage(ctx, { permission: "report.read", orgType: "MANAGER" });
  const t = createT(ctx.user.locale);

  const sp = await searchParams;
  const buildingId = typeof sp.buildingId === "string" && sp.buildingId ? sp.buildingId : undefined;

  const [rows, buildings] = await Promise.all([
    listDebtors({ organizationId: ctx.activeOrganization.id, buildingId }),
    prisma.managedBuilding.findMany({
      where: { organizationId: ctx.activeOrganization.id, archivedAt: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const exportCsv = new URLSearchParams({
    report: "manager-debtors",
    format: "csv",
    ...(buildingId ? { buildingId } : {}),
  }).toString();
  const exportXlsx = new URLSearchParams({
    report: "manager-debtors",
    format: "xlsx",
    ...(buildingId ? { buildingId } : {}),
  }).toString();

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("manager.reports.debtorsTitle")}
        description={t("manager.reports.debtorsDesc")}
      />

      <form
        method="GET"
        className="flex flex-wrap items-end gap-3 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-3"
      >
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

      {rows.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-[var(--color-foreground-muted)]">
            {t("manager.debtors.empty")}
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-md border border-[var(--color-border)] bg-[var(--color-surface)]">
          <table className="min-w-full divide-y divide-[var(--color-border)] text-sm">
            <thead className="bg-[var(--color-surface-inset)] text-left text-xs tracking-wide text-[var(--color-foreground-muted)] uppercase">
              <tr>
                <th className="px-4 py-3">{t("manager.debtors.columns.building")}</th>
                <th className="px-4 py-3">{t("manager.debtors.columns.unit")}</th>
                <th className="px-4 py-3">{t("manager.debtors.columns.owner")}</th>
                <th className="px-4 py-3">{t("manager.debtors.columns.contact")}</th>
                <th className="px-4 py-3">{t("manager.debtors.columns.oldest")}</th>
                <th className="px-4 py-3 text-right">{t("manager.debtors.columns.outstanding")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {rows.map((r) => (
                <tr key={r.unitId} className="hover:bg-[var(--color-surface-inset)]">
                  <td className="px-4 py-3">{r.buildingName}</td>
                  <td className="px-4 py-3 font-mono text-xs">{r.unitCode}</td>
                  <td className="px-4 py-3">{r.primaryOwner ?? "—"}</td>
                  <td className="px-4 py-3 text-xs text-[var(--color-foreground-muted)]">
                    {r.contactEmail ?? r.contactPhone ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-[var(--color-foreground-muted)]">
                    {r.oldestDueDate ? formatDate(r.oldestDueDate) : "—"}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-medium">
                    {formatMoney(r.outstanding, "RSD")}
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
