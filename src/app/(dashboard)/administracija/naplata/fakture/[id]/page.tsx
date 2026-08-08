import { notFound } from "next/navigation";
import { requireSuperAdmin } from "@/server/permissions/require";
import { getInvoiceWithItems } from "@/server/services/billing/invoices/service";
import { prisma } from "@/server/db/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/formatters/date";
import { formatMoney } from "@/lib/formatters/money";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminInvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireSuperAdmin();
  const { id } = await params;
  const invoice = await getInvoiceWithItems(id);
  if (!invoice) notFound();

  const [payments, org] = await Promise.all([
    prisma.paymentAllocation.findMany({
      where: { invoiceId: invoice.id },
      include: { subscriptionPayment: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.organization.findUnique({
      where: { id: invoice.organizationId },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <section className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Faktura {invoice.invoiceNumber ?? "(nacrt)"}</h2>
          <p className="text-sm text-[var(--color-foreground-muted)]">
            {org ? (
              <Link href={`/administracija/organizacije`} className="hover:underline">
                {org.name}
              </Link>
            ) : "—"}
          </p>
        </div>
        <div className="flex gap-2">
          <Badge tone="info">{invoice.status}</Badge>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Detalji</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3 text-sm">
          <Row label="Datum izdavanja" value={invoice.issueDate ? formatDate(invoice.issueDate) : "—"} />
          <Row label="Rok plaćanja" value={invoice.dueDate ? formatDate(invoice.dueDate) : "—"} />
          <Row label="Period" value={invoice.servicePeriodStart ? `${formatDate(invoice.servicePeriodStart)} — ${invoice.servicePeriodEnd ? formatDate(invoice.servicePeriodEnd) : "?"}` : "—"} />
          <Row label="Ukupno" value={formatMoney(Number(invoice.totalAmount.toString()), invoice.currency as "EUR" | "RSD")} />
          <Row label="Plaćeno" value={formatMoney(Number(invoice.amountPaid.toString()), invoice.currency as "EUR" | "RSD")} />
          <Row label="Preostalo" value={formatMoney(Number(invoice.amountDue.toString()), invoice.currency as "EUR" | "RSD")} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Stavke</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-[var(--color-foreground-subtle)]">
              <tr>
                <th className="border-b border-[var(--color-border)] px-3 py-2">Opis</th>
                <th className="border-b border-[var(--color-border)] px-3 py-2 text-right">Količina</th>
                <th className="border-b border-[var(--color-border)] px-3 py-2 text-right">Jedinična</th>
                <th className="border-b border-[var(--color-border)] px-3 py-2 text-right">Iznos</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((it) => (
                <tr key={it.id} className="border-b border-[var(--color-border)] last:border-b-0">
                  <td className="px-3 py-2">{it.description}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{Number(it.quantity.toString())}</td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {formatMoney(Number(it.unitPrice.toString()), invoice.currency as "EUR" | "RSD")}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {formatMoney(Number(it.amount.toString()), invoice.currency as "EUR" | "RSD")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Uplate ({payments.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {payments.length === 0 ? (
            <p className="p-4 text-sm text-[var(--color-foreground-muted)]">Nema uplata.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-[var(--color-foreground-subtle)]">
                <tr>
                  <th className="border-b border-[var(--color-border)] px-3 py-2">Datum</th>
                  <th className="border-b border-[var(--color-border)] px-3 py-2">Metoda</th>
                  <th className="border-b border-[var(--color-border)] px-3 py-2 text-right">Iznos</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((a) => (
                  <tr key={a.id} className="border-b border-[var(--color-border)] last:border-b-0">
                    <td className="px-3 py-2 text-xs">{formatDate(a.subscriptionPayment.paidAt)}</td>
                    <td className="px-3 py-2 text-xs">{a.subscriptionPayment.provider}</td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {formatMoney(Number(a.amount.toString()), invoice.currency as "EUR" | "RSD")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Link
          href={`/api/v1/billing/invoices/${invoice.id}/pdf`}
          className="inline-flex h-9 items-center rounded-md border border-[var(--color-border)] px-3 text-sm hover:bg-[var(--color-surface-hover)]"
        >
          Preuzmi PDF
        </Link>
      </div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-[var(--color-border)] p-3">
      <div className="text-xs text-[var(--color-foreground-muted)]">{label}</div>
      <div className="mt-1 font-medium">{value}</div>
    </div>
  );
}
