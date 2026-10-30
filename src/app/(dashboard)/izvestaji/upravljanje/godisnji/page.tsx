import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/app/stat-card";
import { Button } from "@/components/ui/button";
import { loadUserContext, requireTenantPage } from "@/server/auth/context";
import { buildAnnualActivityReport } from "@/server/services/manager/reports.service";
import { formatMoney } from "@/lib/formatters";
import { createT } from "@/lib/i18n";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function ManagerAnnualReport({ searchParams }: PageProps) {
  const ctx = await loadUserContext();
  requireTenantPage(ctx, { permission: "report.read", orgType: "MANAGER" });
  const t = createT(ctx.user.locale);

  const sp = await searchParams;
  const now = new Date();
  const yearRaw = typeof sp.year === "string" ? parseInt(sp.year, 10) : now.getFullYear();
  const year = Number.isFinite(yearRaw) ? yearRaw : now.getFullYear();

  const report = await buildAnnualActivityReport({
    organizationId: ctx.activeOrganization.id,
    year,
  });

  const pdfHref = `/api/v1/manager/reports/godisnji/pdf?year=${year}`;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("manager.reports.annual.heading")}
        description={t("manager.reports.annualDesc")}
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
        <Button type="submit" variant="outline" size="sm">
          {t("common.open")}
        </Button>
        <div className="ml-auto">
          <Button asChild size="sm">
            <a href={pdfHref}>{t("manager.reports.downloadPdf")}</a>
          </Button>
        </div>
      </form>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">
            {t("manager.reports.annual.buildings")} ({report.buildings.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {report.buildings.length === 0 ? (
            <p className="text-sm text-[var(--color-foreground-muted)]">—</p>
          ) : (
            <ul className="divide-y divide-[var(--color-border)] text-sm">
              {report.buildings.map((b) => (
                <li key={b.id} className="flex items-center justify-between py-2">
                  <span>
                    <strong>{b.name}</strong>
                    <span className="ml-2 text-[var(--color-foreground-muted)]">{b.address}</span>
                  </span>
                  <span className="text-xs text-[var(--color-foreground-muted)]">
                    {b.units} delova
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-2 text-sm font-semibold">{t("manager.reports.annual.duesBlock")}</h2>
        <div className="grid gap-3 md:grid-cols-3">
          <StatCard
            label={t("manager.reports.totalCharged")}
            value={formatMoney(report.dues.chargedTotal, "RSD")}
            hint={`${report.dues.chargesCount}`}
          />
          <StatCard
            label={t("manager.reports.totalCollected")}
            value={formatMoney(report.dues.paidTotal, "RSD")}
          />
          <StatCard
            label={t("manager.reports.outstanding")}
            value={formatMoney(report.dues.outstanding, "RSD")}
          />
        </div>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold">{t("manager.reports.annual.expensesBlock")}</h2>
        {report.expensesByFund.length === 0 ? (
          <p className="text-sm text-[var(--color-foreground-muted)]">—</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-3">
            {report.expensesByFund.map((f) => (
              <StatCard
                key={f.fund}
                label={t(`manager.reports.expenseFund.${f.fund}` as const)}
                value={formatMoney(f.total, "RSD")}
                hint={`${f.count}`}
              />
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold">{t("manager.reports.annual.ticketsBlock")}</h2>
        <div className="grid gap-3 md:grid-cols-4">
          <StatCard
            label={t("manager.reports.annual.reportedTickets")}
            value={String(report.tickets.reported)}
          />
          <StatCard
            label={t("manager.reports.annual.completedTickets")}
            value={String(report.tickets.completed)}
          />
          <StatCard
            label={t("manager.reports.annual.stillOpenTickets")}
            value={String(report.tickets.stillOpen)}
          />
          <StatCard
            label={t("manager.reports.annual.canceledTickets")}
            value={String(report.tickets.canceled)}
          />
        </div>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold">
          {t("manager.reports.annual.assembliesBlock")}
        </h2>
        <div className="grid gap-3 md:grid-cols-3">
          <StatCard
            label={t("manager.reports.annual.scheduledAssemblies")}
            value={String(report.assemblies.scheduled)}
          />
          <StatCard
            label={t("manager.reports.annual.completedAssemblies")}
            value={String(report.assemblies.completed)}
          />
          <StatCard
            label={t("manager.reports.annual.canceledAssemblies")}
            value={String(report.assemblies.canceled)}
          />
        </div>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold">{t("manager.reports.annual.noticesBlock")}</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <StatCard
            label={t("manager.reports.annual.publishedNotices")}
            value={String(report.notices.publishedCount)}
          />
          <StatCard
            label={t("manager.reports.annual.deliveredEmails")}
            value={String(report.notices.totalDeliveries)}
          />
        </div>
      </div>
    </div>
  );
}
