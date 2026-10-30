import { Fragment } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { prisma } from "@/server/db/prisma";
import { requireResidentSession } from "@/server/auth/resident-guard";
import { listResidentUnitsForSession } from "@/server/auth/resident-session";
import { formatDate, formatMoney } from "@/lib/formatters";
import type { DuesChargeStatus } from "@prisma/client";

const STATUS_LABEL: Record<DuesChargeStatus, string> = {
  OPEN: "Otvoreno",
  PARTIALLY_PAID: "Delimično",
  PAID: "Plaćeno",
  WRITTEN_OFF: "Otpisano",
};

/**
 * Resident dues page. Shows every charge for every unit the resident is
 * linked to, newest first. The uplatnica PDF link goes through the
 * public-residents API route which re-verifies the signed cookie.
 */
export default async function ResidentDuesPage() {
  const session = await requireResidentSession();
  const accesses = await listResidentUnitsForSession(session);
  const unitIds = accesses.map((a) => a.unitId);

  const charges = await prisma.duesCharge.findMany({
    where: { unitId: { in: unitIds } },
    include: {
      unit: { select: { id: true, code: true } },
      building: { select: { id: true, name: true } },
      payments: {
        where: { reversed: false },
        orderBy: { paidAt: "desc" },
        select: {
          id: true,
          amount: true,
          currency: true,
          paidAt: true,
          method: true,
          reference: true,
        },
      },
    },
    orderBy: [{ dueDate: "desc" }],
    take: 60,
  });

  const totals = charges.reduce(
    (acc, c) => {
      const outstanding = Number(c.totalAmount) - Number(c.paidAmount);
      acc.totalBilled += Number(c.totalAmount);
      acc.totalPaid += Number(c.paidAmount);
      acc.totalOutstanding += Math.max(0, outstanding);
      return acc;
    },
    { totalBilled: 0, totalPaid: 0, totalOutstanding: 0 },
  );

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Zaduženja</h1>

      {charges.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <SummaryCard
            label="Ukupno zaduženo"
            value={formatMoney(totals.totalBilled.toFixed(2), "RSD")}
          />
          <SummaryCard
            label="Ukupno uplaćeno"
            value={formatMoney(totals.totalPaid.toFixed(2), "RSD")}
          />
          <SummaryCard
            label="Preostalo"
            value={formatMoney(totals.totalOutstanding.toFixed(2), "RSD")}
            tone="warn"
          />
        </div>
      ) : null}

      {charges.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-[var(--color-foreground-muted)]">
            Nema evidentiranih zaduženja.
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-md border border-[var(--color-border)] bg-[var(--color-surface)]">
          <table className="min-w-full divide-y divide-[var(--color-border)] text-sm">
            <thead className="bg-[var(--color-surface-inset)] text-left text-xs tracking-wide text-[var(--color-foreground-muted)] uppercase">
              <tr>
                <th className="px-4 py-3">Zgrada</th>
                <th className="px-4 py-3">Deo</th>
                <th className="px-4 py-3">Period</th>
                <th className="px-4 py-3">Rok</th>
                <th className="px-4 py-3 text-right">Ukupno</th>
                <th className="px-4 py-3 text-right">Preostalo</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Uplatnica</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {charges.map((c) => {
                const outstanding = (Number(c.totalAmount) - Number(c.paidAmount)).toFixed(2);
                return (
                  <Fragment key={c.id}>
                    <tr className="hover:bg-[var(--color-surface-inset)]">
                      <td className="px-4 py-3">{c.building.name}</td>
                      <td className="px-4 py-3 font-mono text-xs">{c.unit.code}</td>
                      <td className="px-4 py-3">
                        {String(c.periodYear).padStart(4, "0")}-
                        {String(c.periodMonth).padStart(2, "0")}
                      </td>
                      <td className="px-4 py-3 text-[var(--color-foreground-muted)]">
                        {formatDate(c.dueDate)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {formatMoney(c.totalAmount, "RSD")}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums">
                        {formatMoney(outstanding, "RSD")}
                      </td>
                      <td className="px-4 py-3 text-xs">{STATUS_LABEL[c.status]}</td>
                      <td className="px-4 py-3 text-right">
                        <a
                          href={`/api/stanar/dues/${c.id}/pdf`}
                          className="text-xs text-[var(--color-brand-700)] hover:underline"
                        >
                          PDF
                        </a>
                      </td>
                    </tr>
                    {c.payments.length > 0 ? (
                      <tr className="bg-[var(--color-surface-inset)]/60">
                        <td colSpan={8} className="px-4 pb-3">
                          <details>
                            <summary className="cursor-pointer text-xs text-[var(--color-foreground-muted)]">
                              Istorija uplata ({c.payments.length})
                            </summary>
                            <ul className="mt-2 space-y-1 text-xs">
                              {c.payments.map((p) => (
                                <li
                                  key={p.id}
                                  className="flex items-center justify-between gap-3 border-b border-[var(--color-border)] pb-1 last:border-b-0"
                                >
                                  <span>
                                    {formatDate(p.paidAt)} · {p.method}
                                    {p.reference ? ` · ${p.reference}` : ""}
                                  </span>
                                  <span className="font-semibold tabular-nums">
                                    {formatMoney(p.amount, p.currency as "RSD")}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </details>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, tone }: { label: string; value: string; tone?: "warn" }) {
  return (
    <div
      className={`rounded-md border p-3 ${
        tone === "warn"
          ? "border-amber-300 bg-amber-50"
          : "border-[var(--color-border)] bg-[var(--color-surface)]"
      }`}
    >
      <div className="text-xs text-[var(--color-foreground-muted)]">{label}</div>
      <div className="mt-1 text-lg font-semibold tabular-nums">{value}</div>
    </div>
  );
}
