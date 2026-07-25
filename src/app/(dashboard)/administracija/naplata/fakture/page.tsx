import Link from "next/link";
import { requireSuperAdmin } from "@/server/permissions/require";
import { listInvoices } from "@/server/services/billing/invoices/service";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/formatters/date";
import { formatMoney } from "@/lib/formatters/money";
import type { InvoiceStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<InvoiceStatus, string> = {
  DRAFT: "Nacrt",
  ISSUED: "Izdata",
  SENT: "Poslata",
  PARTIALLY_PAID: "Delimično",
  PAID: "Plaćena",
  OVERDUE: "Zakasnela",
  CANCELED: "Otkazana",
  VOID: "Poništena",
};

const STATUS_TONE: Record<InvoiceStatus, "success" | "warning" | "danger" | "info" | "neutral"> = {
  DRAFT: "neutral",
  ISSUED: "info",
  SENT: "info",
  PARTIALLY_PAID: "warning",
  PAID: "success",
  OVERDUE: "danger",
  CANCELED: "danger",
  VOID: "neutral",
};

interface PageProps {
  searchParams: Promise<{ page?: string; status?: string }>;
}

export default async function BillingInvoicesPage({ searchParams }: PageProps) {
  await requireSuperAdmin();
  const sp = await searchParams;
  const page = Number.parseInt(sp.page ?? "1", 10) || 1;
  const status = sp.status ? (sp.status as InvoiceStatus) : undefined;
  const { items, total } = await listInvoices({ page, pageSize: 50, status });

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Fakture ({total})</h2>
        <form className="flex items-center gap-2" action="/administracija/naplata/fakture">
          <select
            name="status"
            defaultValue={sp.status ?? ""}
            className="h-9 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm"
          >
            <option value="">Svi statusi</option>
            {(Object.keys(STATUS_LABEL) as InvoiceStatus[]).map((s) => (
              <option key={s} value={s}>{STATUS_LABEL[s]}</option>
            ))}
          </select>
          <button
            type="submit"
            className="h-9 rounded-md border border-[var(--color-border)] px-3 text-sm hover:bg-[var(--color-surface-hover)]"
          >
            Primeni
          </button>
        </form>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-[var(--color-foreground-subtle)]">
                <tr>
                  <th className="border-b border-[var(--color-border)] px-3 py-2">Broj</th>
                  <th className="border-b border-[var(--color-border)] px-3 py-2">Status</th>
                  <th className="border-b border-[var(--color-border)] px-3 py-2">Izdata</th>
                  <th className="border-b border-[var(--color-border)] px-3 py-2">Rok</th>
                  <th className="border-b border-[var(--color-border)] px-3 py-2 text-right">Ukupno</th>
                  <th className="border-b border-[var(--color-border)] px-3 py-2 text-right">Preostalo</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-6 text-center text-[var(--color-foreground-muted)]">
                      Nema faktura koje odgovaraju filterima.
                    </td>
                  </tr>
                ) : (
                  items.map((inv) => (
                    <tr key={inv.id} className="border-b border-[var(--color-border)] last:border-b-0">
                      <td className="px-3 py-2 font-mono text-xs">
                        <Link href={`/administracija/naplata/fakture/${inv.id}`} className="text-[var(--color-brand-700)] hover:underline">
                          {inv.invoiceNumber ?? "(nacrt)"}
                        </Link>
                      </td>
                      <td className="px-3 py-2">
                        <Badge tone={STATUS_TONE[inv.status]}>{STATUS_LABEL[inv.status]}</Badge>
                      </td>
                      <td className="px-3 py-2 text-xs">
                        {inv.issueDate ? formatDate(inv.issueDate) : "—"}
                      </td>
                      <td className="px-3 py-2 text-xs">
                        {inv.dueDate ? formatDate(inv.dueDate) : "—"}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {formatMoney(Number(inv.totalAmount.toString()), inv.currency as "EUR" | "RSD")}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {formatMoney(Number(inv.amountDue.toString()), inv.currency as "EUR" | "RSD")}
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
