import { requireSuperAdmin } from "@/server/permissions/require";
import { prisma } from "@/server/db/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatDateTime } from "@/lib/formatters/date";
import { formatMoney } from "@/lib/formatters/money";
import { listReviewQueue } from "@/server/services/billing/bank-statement/service";
import { UploadStatementForm } from "./upload-form";
import { ManualMatchForm } from "./manual-match-form";
import { createT, type TranslationKey } from "@/lib/i18n";
import { resolveRequestLocale } from "@/lib/i18n/resolve-locale";

export const dynamic = "force-dynamic";

export default async function BankStatementsPage() {
  await requireSuperAdmin();
  const t = createT(await resolveRequestLocale());
  const [imports, queue] = await Promise.all([
    prisma.bankStatementImport.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    listReviewQueue(),
  ]);

  return (
    <section className="space-y-6">
      <header>
        <h2 className="text-lg font-semibold">{t("admin.statements.title")}</h2>
        <p className="text-sm text-[var(--color-foreground-muted)]">
          {t("admin.statements.subtitle")}
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("admin.statements.importNew")}</CardTitle>
        </CardHeader>
        <CardContent>
          <UploadStatementForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("admin.statements.recentImports")}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-[var(--color-foreground-subtle)]">
              <tr>
                <th className="border-b border-[var(--color-border)] px-3 py-2">
                  {t("common.date")}
                </th>
                <th className="border-b border-[var(--color-border)] px-3 py-2">
                  {t("admin.statements.colFile")}
                </th>
                <th className="border-b border-[var(--color-border)] px-3 py-2">
                  {t("admin.statements.colFormat")}
                </th>
                <th className="border-b border-[var(--color-border)] px-3 py-2 text-right">
                  {t("billing.columns.total")}
                </th>
                <th className="border-b border-[var(--color-border)] px-3 py-2 text-right">
                  {t("admin.statements.colMatched")}
                </th>
                <th className="border-b border-[var(--color-border)] px-3 py-2 text-right">
                  {t("admin.statements.colUnmatched")}
                </th>
              </tr>
            </thead>
            <tbody>
              {imports.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-[var(--color-foreground-muted)]">
                    {t("admin.statements.emptyImports")}
                  </td>
                </tr>
              ) : (
                imports.map((r) => (
                  <tr key={r.id} className="border-b border-[var(--color-border)] last:border-b-0">
                    <td className="px-3 py-2 text-xs">{formatDateTime(r.createdAt)}</td>
                    <td className="px-3 py-2 text-xs">{r.fileName}</td>
                    <td className="px-3 py-2 text-xs">{r.format}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{r.totalTransactions}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{r.matchedCount}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{r.unmatchedCount}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {t("admin.statements.queueTitle", { count: queue.length })}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {queue.length === 0 ? (
            <p className="p-4 text-sm text-[var(--color-foreground-muted)]">
              {t("admin.statements.queueEmpty")}
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-[var(--color-foreground-subtle)]">
                <tr>
                  <th className="border-b border-[var(--color-border)] px-3 py-2">
                    {t("common.date")}
                  </th>
                  <th className="border-b border-[var(--color-border)] px-3 py-2">
                    {t("billing.columns.counterparty")}
                  </th>
                  <th className="border-b border-[var(--color-border)] px-3 py-2">
                    {t("billing.columns.reference")}
                  </th>
                  <th className="border-b border-[var(--color-border)] px-3 py-2 text-right">
                    {t("common.amount")}
                  </th>
                  <th className="border-b border-[var(--color-border)] px-3 py-2">
                    {t("common.statusLabel")}
                  </th>
                  <th className="border-b border-[var(--color-border)] px-3 py-2">
                    {t("common.actions")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {queue.map((tx) => (
                  <tr key={tx.id} className="border-b border-[var(--color-border)] last:border-b-0">
                    <td className="px-3 py-2 text-xs">{formatDate(tx.transactionDate)}</td>
                    <td className="px-3 py-2 text-xs">{tx.counterpartyName ?? t("admin.dash")}</td>
                    <td className="px-3 py-2 text-xs">
                      {tx.reference ?? tx.counterpartyRef ?? tx.narrative ?? t("admin.dash")}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {formatMoney(Number(tx.amount.toString()), tx.currency as "EUR" | "RSD")}
                    </td>
                    <td className="px-3 py-2">
                      <Badge tone={tx.matchStatus === "REVIEW_REQUIRED" ? "warning" : "neutral"}>
                        {t(`billing.matchStatus.${tx.matchStatus}` as TranslationKey)}
                        {tx.matchConfidence
                          ? ` ${t("admin.confidencePct", { pct: tx.matchConfidence })}`
                          : ""}
                      </Badge>
                    </td>
                    <td className="px-3 py-2">
                      <ManualMatchForm transactionId={tx.id} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
