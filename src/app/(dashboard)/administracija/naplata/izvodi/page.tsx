import { requireSuperAdmin } from "@/server/permissions/require";
import { prisma } from "@/server/db/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatDateTime } from "@/lib/formatters/date";
import { formatMoney } from "@/lib/formatters/money";
import { listReviewQueue } from "@/server/services/billing/bank-statement/service";
import { UploadStatementForm } from "./upload-form";
import { ManualMatchForm } from "./manual-match-form";

export const dynamic = "force-dynamic";

export default async function BankStatementsPage() {
  await requireSuperAdmin();
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
        <h2 className="text-lg font-semibold">Bankovni izvodi</h2>
        <p className="text-sm text-[var(--color-foreground-muted)]">
          Uvoz CSV/XLSX izvoda i pregled queue-a za sparivanje. MT940 i CAMT053 formati su u pripremi.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Uvezi novi izvod</CardTitle>
        </CardHeader>
        <CardContent>
          <UploadStatementForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Poslednji uvozi</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-[var(--color-foreground-subtle)]">
              <tr>
                <th className="border-b border-[var(--color-border)] px-3 py-2">Datum</th>
                <th className="border-b border-[var(--color-border)] px-3 py-2">Fajl</th>
                <th className="border-b border-[var(--color-border)] px-3 py-2">Format</th>
                <th className="border-b border-[var(--color-border)] px-3 py-2 text-right">Ukupno</th>
                <th className="border-b border-[var(--color-border)] px-3 py-2 text-right">Uparen.</th>
                <th className="border-b border-[var(--color-border)] px-3 py-2 text-right">Neuparen.</th>
              </tr>
            </thead>
            <tbody>
              {imports.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-[var(--color-foreground-muted)]">
                    Nema uvezenih izvoda.
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
          <CardTitle className="text-base">Queue za sparivanje ({queue.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {queue.length === 0 ? (
            <p className="p-4 text-sm text-[var(--color-foreground-muted)]">
              Queue je prazan.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-[var(--color-foreground-subtle)]">
                <tr>
                  <th className="border-b border-[var(--color-border)] px-3 py-2">Datum</th>
                  <th className="border-b border-[var(--color-border)] px-3 py-2">Pošiljalac</th>
                  <th className="border-b border-[var(--color-border)] px-3 py-2">Referenca</th>
                  <th className="border-b border-[var(--color-border)] px-3 py-2 text-right">Iznos</th>
                  <th className="border-b border-[var(--color-border)] px-3 py-2">Status</th>
                  <th className="border-b border-[var(--color-border)] px-3 py-2">Akcije</th>
                </tr>
              </thead>
              <tbody>
                {queue.map((tx) => (
                  <tr key={tx.id} className="border-b border-[var(--color-border)] last:border-b-0">
                    <td className="px-3 py-2 text-xs">{formatDate(tx.transactionDate)}</td>
                    <td className="px-3 py-2 text-xs">{tx.counterpartyName ?? "—"}</td>
                    <td className="px-3 py-2 text-xs">
                      {tx.reference ?? tx.counterpartyRef ?? tx.narrative ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {formatMoney(Number(tx.amount.toString()), tx.currency as "EUR" | "RSD")}
                    </td>
                    <td className="px-3 py-2">
                      <Badge tone={tx.matchStatus === "REVIEW_REQUIRED" ? "warning" : "neutral"}>
                        {tx.matchStatus} {tx.matchConfidence ? `(${tx.matchConfidence}%)` : ""}
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
