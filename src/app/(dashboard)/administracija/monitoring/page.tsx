import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/app/stat-card";
import { formatDateTime } from "@/lib/formatters/date";
import {
  listRecentHealthChecks,
  summarizeBackupVerify,
} from "@/server/services/monitoring/backup-verify.service";
import { requireSuperAdmin } from "@/server/permissions/require";
import { serverEnv } from "@/lib/env";
import { BackupVerifyButton } from "@/features/platform-admin/backup-verify-button";
import { createT } from "@/lib/i18n";
import { resolveRequestLocale } from "@/lib/i18n/resolve-locale";

export const dynamic = "force-dynamic";

/**
 * Platform-admin monitoring dashboard — Faza 8.3 (C4).
 *
 * Currently shows the last 30 entries from the automatic backup
 * verifier. Additional kinds (DB_MIGRATE_STATUS, etc.) will slot in
 * here as they are wired up.
 */
export default async function MonitoringPage() {
  await requireSuperAdmin();
  const [rows, summary] = await Promise.all([
    listRecentHealthChecks(30),
    summarizeBackupVerify(),
  ]);
  const t = createT(await resolveRequestLocale());

  const backupRows = rows.filter((r) => r.kind === "BACKUP_VERIFY");
  const otherRows = rows.filter((r) => r.kind !== "BACKUP_VERIFY");

  const lastStatusLabel = summary.lastStatus
    ? summary.lastStatus === "OK"
      ? "OK"
      : "FAIL"
    : t("admin.dash");

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{t("admin.monitoringPage.title")}</h2>
          <p className="text-sm text-[var(--color-foreground-muted)]">
            {t("admin.monitoringPage.subtitle")}
          </p>
        </div>
        <BackupVerifyButton />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label={t("admin.monitoringPage.lastBackup")}
          value={
            summary.lastRunAt ? formatDateTime(summary.lastRunAt) : t("admin.never")
          }
          hint={t("admin.statusHint", { status: lastStatusLabel })}
        />
        <StatCard
          label={t("admin.monitoringPage.consecutiveFailures")}
          value={String(summary.consecutiveFailures)}
          hint={
            summary.consecutiveFailures >= 2
              ? t("admin.monitoringPage.warningSent")
              : t("admin.monitoringPage.systemStable")
          }
        />
        <StatCard
          label={t("admin.monitoringPage.successRate")}
          value={
            summary.successRate === null
              ? t("admin.dash")
              : `${Math.round(summary.successRate * 100)}%`
          }
        />
        <StatCard
          label={t("admin.source")}
          value={
            serverEnv.BACKUP_VERIFY_SOURCE === "disabled"
              ? t("admin.monitoringPage.sourceDisabled")
              : serverEnv.BACKUP_VERIFY_SOURCE.toUpperCase()
          }
          hint={
            serverEnv.BACKUP_VERIFY_SOURCE === "local"
              ? serverEnv.BACKUP_VERIFY_LOCAL_DIR ?? t("admin.dash")
              : serverEnv.BACKUP_VERIFY_SOURCE === "s3"
                ? [
                    serverEnv.BACKUP_VERIFY_S3_BUCKET,
                    serverEnv.BACKUP_VERIFY_S3_PREFIX,
                  ]
                    .filter(Boolean)
                    .join(" / ")
                : t("admin.monitoringPage.sourceHintEnv")
          }
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{t("admin.monitoringPage.timeline")}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-[var(--color-foreground-subtle)]">
                <tr>
                  <th className="border-b border-[var(--color-border)] px-4 py-2">
                    {t("admin.time")}
                  </th>
                  <th className="border-b border-[var(--color-border)] px-4 py-2">
                    {t("common.statusLabel")}
                  </th>
                  <th className="border-b border-[var(--color-border)] px-4 py-2">
                    {t("admin.message")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {backupRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-4 py-8 text-center text-[var(--color-foreground-muted)]"
                    >
                      {t("admin.monitoringPage.emptyBackup")}
                    </td>
                  </tr>
                ) : (
                  backupRows.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-[var(--color-border)] last:border-b-0"
                    >
                      <td className="whitespace-nowrap px-4 py-2 text-xs">
                        {formatDateTime(row.runAt)}
                      </td>
                      <td className="px-4 py-2">
                        {row.status === "OK" ? (
                          <Badge tone="success">OK</Badge>
                        ) : (
                          <Badge tone="danger">FAIL</Badge>
                        )}
                      </td>
                      <td className="px-4 py-2 text-xs text-[var(--color-foreground-muted)]">
                        {row.message ?? t("admin.dash")}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {otherRows.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t("admin.monitoringPage.otherHealth")}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y divide-[var(--color-border)]">
              {otherRows.map((row) => (
                <li key={row.id} className="grid gap-1 px-4 py-2 sm:grid-cols-[9rem_6rem_1fr]">
                  <span className="text-xs text-[var(--color-foreground-muted)]">
                    {formatDateTime(row.runAt)}
                  </span>
                  <span className="font-mono text-xs">{row.kind}</span>
                  <span className="text-xs">
                    {row.status === "OK" ? (
                      <Badge tone="success">OK</Badge>
                    ) : (
                      <Badge tone="danger">FAIL</Badge>
                    )}{" "}
                    <span className="ml-2 text-[var(--color-foreground-muted)]">
                      {row.message ?? t("admin.dash")}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}
    </section>
  );
}
