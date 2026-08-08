import Link from "next/link";
import { requireSuperAdmin } from "@/server/permissions/require";
import { prisma } from "@/server/db/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/formatters/date";
import { formatMoney } from "@/lib/formatters/money";

export const dynamic = "force-dynamic";

export default async function BillingPaymentsPage() {
  await requireSuperAdmin();
  const [payments, total] = await Promise.all([
    prisma.subscriptionPayment.findMany({
      orderBy: { paidAt: "desc" },
      take: 100,
      include: {
        organization: { select: { name: true } },
        allocations: {
          include: { invoice: { select: { invoiceNumber: true, id: true } } },
        },
      },
    }),
    prisma.subscriptionPayment.count(),
  ]);

  return (
    <section className="space-y-4">
      <header className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Uplate ({total})</h2>
      </header>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-[var(--color-foreground-subtle)]">
              <tr>
                <th className="border-b border-[var(--color-border)] px-3 py-2">Datum</th>
                <th className="border-b border-[var(--color-border)] px-3 py-2">Organizacija</th>
                <th className="border-b border-[var(--color-border)] px-3 py-2">Metod</th>
                <th className="border-b border-[var(--color-border)] px-3 py-2 text-right">Iznos</th>
                <th className="border-b border-[var(--color-border)] px-3 py-2">Fakture</th>
                <th className="border-b border-[var(--color-border)] px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {payments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-[var(--color-foreground-muted)]">
                    Nema uplata.
                  </td>
                </tr>
              ) : (
                payments.map((p) => (
                  <tr key={p.id} className="border-b border-[var(--color-border)] last:border-b-0">
                    <td className="px-3 py-2 text-xs">{formatDateTime(p.paidAt)}</td>
                    <td className="px-3 py-2">{p.organization.name}</td>
                    <td className="px-3 py-2 text-xs">{p.provider}</td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {formatMoney(Number(p.amount.toString()), p.currency as "EUR" | "RSD")}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {p.allocations.length === 0 ? (
                        <span className="text-[var(--color-foreground-muted)]">—</span>
                      ) : (
                        p.allocations.map((a) => (
                          <Link
                            key={a.id}
                            href={`/administracija/naplata/fakture/${a.invoice.id}`}
                            className="mr-2 text-[var(--color-brand-700)] hover:underline"
                          >
                            {a.invoice.invoiceNumber ?? a.invoice.id.slice(0, 6)}
                          </Link>
                        ))
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <Badge tone={p.status === "COMPLETED" ? "success" : p.status === "REVERSED" ? "danger" : "warning"}>
                        {p.status}
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </section>
  );
}
