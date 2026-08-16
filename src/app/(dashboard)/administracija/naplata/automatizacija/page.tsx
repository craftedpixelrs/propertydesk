import { requireSuperAdmin } from "@/server/permissions/require";
import { getOrCreateGlobalBillingSettings } from "@/server/services/billing/settings/global.service";
import { prisma } from "@/server/db/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RunJobButton } from "./run-job-button";
import { formatDateTime } from "@/lib/formatters/date";
import "@/server/jobs/definitions";
import { listJobs } from "@/server/jobs";
import { createT } from "@/lib/i18n";
import { resolveRequestLocale } from "@/lib/i18n/resolve-locale";

export const dynamic = "force-dynamic";

interface JobRow {
  name: string;
  description: string;
  cron: string;
  toggleKey?: keyof Awaited<ReturnType<typeof getOrCreateGlobalBillingSettings>>;
  enabled: boolean;
}

export default async function BillingAutomationPage() {
  await requireSuperAdmin();
  const t = createT(await resolveRequestLocale());
  const settings = await getOrCreateGlobalBillingSettings();

  const master = settings.billingEnabled;
  const billingJobs = listJobs().filter((j) => j.name.startsWith("billing-"));

  const rows: JobRow[] = billingJobs.map((j) => {
    let enabled = master;
    if (j.name === "billing-generate-invoices") enabled = master && settings.autoGenerateInvoicesEnabled;
    if (j.name === "billing-send-invoices") enabled = master && settings.autoSendInvoicesEnabled;
    if (j.name === "billing-send-reminders") enabled = master && settings.autoRemindersEnabled;
    if (j.name === "billing-process-overdue") enabled = master && settings.autoOverdueEnabled;
    if (j.name === "billing-extend-subscriptions") enabled = master && settings.autoExtendSubscriptions;
    return {
      name: j.name,
      description: j.description,
      cron: j.suggestedCron,
      enabled,
    };
  });

  const recentRuns = await prisma.billingJobRun.findMany({
    orderBy: { startedAt: "desc" },
    take: 20,
    include: {
      triggeredByUser: { select: { name: true, email: true } },
    },
  });

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h2 className="text-lg font-semibold">{t("admin.automation.title")}</h2>
        <p className="text-sm text-[var(--color-foreground-muted)]">
          {t("admin.automation.masterOn")}{" "}
          {master ? (
            <Badge tone="success">{t("admin.automation.masterActive")}</Badge>
          ) : (
            <Badge tone="danger">{t("admin.automation.masterOff")}</Badge>
          )}
          {t("admin.automation.masterHint")}
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("admin.automation.jobs")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {rows.map((row) => (
            <div
              key={row.name}
              className="flex flex-col gap-3 rounded-md border border-[var(--color-border)] p-3 md:flex-row md:items-center md:justify-between"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm">{row.name}</span>
                  {row.enabled ? (
                    <Badge tone="success">{t("admin.enabled")}</Badge>
                  ) : (
                    <Badge tone="warning">{t("admin.disabled")}</Badge>
                  )}
                </div>
                <p className="mt-1 text-sm text-[var(--color-foreground-muted)]">
                  {row.description}
                </p>
                <p className="mt-1 text-xs text-[var(--color-foreground-subtle)]">
                  {t("admin.automation.cron")} <code className="font-mono">{row.cron}</code>
                </p>
              </div>
              <RunJobButton name={row.name} />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("admin.automation.recentRuns")}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-[var(--color-foreground-subtle)]">
                <tr>
                  <th className="border-b border-[var(--color-border)] px-3 py-2">
                    {t("admin.automation.colKind")}
                  </th>
                  <th className="border-b border-[var(--color-border)] px-3 py-2">
                    {t("common.statusLabel")}
                  </th>
                  <th className="border-b border-[var(--color-border)] px-3 py-2">
                    {t("admin.automation.colStarted")}
                  </th>
                  <th className="border-b border-[var(--color-border)] px-3 py-2">
                    {t("admin.automation.colDuration")}
                  </th>
                  <th className="border-b border-[var(--color-border)] px-3 py-2">
                    {t("admin.automation.colResult")}
                  </th>
                  <th className="border-b border-[var(--color-border)] px-3 py-2">
                    {t("admin.automation.colTrigger")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {recentRuns.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-6 text-center text-[var(--color-foreground-muted)]">
                      {t("admin.automation.empty")}
                    </td>
                  </tr>
                ) : (
                  recentRuns.map((r) => (
                    <tr key={r.id} className="border-b border-[var(--color-border)] last:border-b-0">
                      <td className="px-3 py-2 font-mono text-xs">{r.jobType}</td>
                      <td className="px-3 py-2">
                        <Badge
                          tone={
                            r.status === "COMPLETED"
                              ? "success"
                              : r.status === "FAILED"
                                ? "danger"
                                : r.status === "COMPLETED_WITH_ERRORS"
                                  ? "warning"
                                  : "info"
                          }
                        >
                          {r.status}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 text-xs">{formatDateTime(r.startedAt)}</td>
                      <td className="px-3 py-2 text-xs">
                        {r.durationMs
                          ? t("admin.durationSeconds", { seconds: (r.durationMs / 1000).toFixed(1) })
                          : t("admin.dash")}
                      </td>
                      <td className="px-3 py-2 text-xs">
                        {t("admin.jobResult", {
                          processed: r.processedCount,
                          success: r.successCount,
                          errors: r.errorCount,
                          skipped: r.skippedCount,
                        })}
                      </td>
                      <td className="px-3 py-2 text-xs">
                        {r.triggeredByUser
                          ? t("admin.jobTriggerWithUser", {
                              trigger: r.triggeredBy,
                              email: r.triggeredByUser.email,
                            })
                          : r.triggeredBy}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
