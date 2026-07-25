import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/server/permissions/require";
import { getInvoiceWithItems } from "@/server/services/billing/invoices/service";
import { prisma } from "@/server/db/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/formatters/date";
import { formatMoney } from "@/lib/formatters/money";
import { ApiError } from "@/lib/api/errors";

export const dynamic = "force-dynamic";

export default async function TenantInvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await requirePermission("billing.invoice.read");
  const { id } = await params;
  const invoice = await getInvoiceWithItems(id);
  if (!invoice) notFound();
  if (invoice.organizationId !== ctx.organization.organizationId) {
    throw new ApiError("FORBIDDEN", "Fakturu nije moguće otvoriti iz druge organizacije.");
  }

  const allocations = await prisma.paymentAllocation.findMany({
    where: { invoiceId: invoice.id },
    include: { subscriptionPayment: true },
    orderBy: { createdAt: "asc" },
  });

  return (
    <section className="space-y-6">
      <header className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold">Faktura {invoice.invoiceNumber ?? "(nacrt)"}</h2>
          <p className="text-sm text-[var(--color-foreground-muted)]">
            Period: {invoice.servicePeriodStart ? formatDate(invoice.servicePeriodStart) : "—"} — {invoice.servicePeriodEnd ? formatDate(invoice.servicePeriodEnd) : "—"}
          </p>
        </div>
        <div className="flex gap-2">
          <Badge tone="info">{invoice.status}</Badge>
        </div>
      </header>

      <Card>
        <CardContent className="grid gap-3 md:grid-cols-3 text-sm p-4">
          <Field label="Izdata" value={invoice.issueDate ? formatDate(invoice.issueDate) : "—"} />
          <Field label="Rok" value={invoice.dueDate ? formatDate(invoice.dueDate) : "—"} />
          <Field label="Napomena" value={invoice.note ?? "—"} />
          <Field
            label="Ukupno"
            value={formatMoney(Number(invoice.totalAmount.toString()), invoice.currency as "EUR" | "RSD")}
          />
          <Field
            label="Plaćeno"
            value={formatMoney(Number(invoice.amountPaid.toString()), invoice.currency as "EUR" | "RSD")}
          />
          <Field
            label="Preostalo"
            value={formatMoney(Number(invoice.amountDue.toString()), invoice.currency as "EUR" | "RSD")}
          />
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

      {allocations.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Uplate ({allocations.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-[var(--color-foreground-subtle)]">
                <tr>
                  <th className="border-b border-[var(--color-border)] px-3 py-2">Datum</th>
                  <th className="border-b border-[var(--color-border)] px-3 py-2">Metoda</th>
                  <th className="border-b border-[var(--color-border)] px-3 py-2 text-right">Iznos</th>
                </tr>
              </thead>
              <tbody>
                {allocations.map((a) => (
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
          </CardContent>
        </Card>
      ) : null}

      <div className="flex gap-2">
        <Button asChild>
          <Link href={`/api/v1/billing/invoices/${invoice.id}/pdf`}>
            Preuzmi PDF
          </Link>
        </Button>
      </div>
    </section>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-[var(--color-border)] p-3">
      <div className="text-xs text-[var(--color-foreground-muted)]">{label}</div>
      <div className="mt-1 font-medium">{value}</div>
    </div>
  );
}
