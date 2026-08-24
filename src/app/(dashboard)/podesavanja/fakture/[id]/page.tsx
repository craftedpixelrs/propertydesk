import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { loadUserContext } from "@/server/auth/context";
import { getInvoiceWithItems } from "@/server/services/billing/invoices/service";
import { prisma } from "@/server/db/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/formatters/date";
import { formatMoney } from "@/lib/formatters/money";
import { createT, type TranslationKey } from "@/lib/i18n";
import { resolveRequestLocale } from "@/lib/i18n/resolve-locale";

export const dynamic = "force-dynamic";

export default async function TenantInvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await loadUserContext();
  if (!ctx) redirect("/sign-in");
  if (!ctx.activeOrganization) redirect("/podesavanja");
  if (
    ctx.activeOrganization.type !== "INVESTOR" ||
    (!ctx.isSuperAdmin && !ctx.permissions.includes("billing.invoice.read"))
  ) {
    redirect("/podesavanja");
  }
  const t = createT(await resolveRequestLocale());
  const { id } = await params;
  const invoice = await getInvoiceWithItems(id);
  if (!invoice) notFound();
  if (invoice.organizationId !== ctx.activeOrganization.id) {
    notFound();
  }

  const allocations = await prisma.paymentAllocation.findMany({
    where: { invoiceId: invoice.id },
    include: { subscriptionPayment: true },
    orderBy: { createdAt: "asc" },
  });

  const statusKey = `billing.invoiceStatus.${invoice.status}` as TranslationKey;
  const statusLabel = t(statusKey) === statusKey ? invoice.status : t(statusKey);

  return (
    <section className="space-y-6">
      <Link
        href="/podesavanja/fakture"
        className="text-sm text-[var(--color-brand-700)] hover:underline"
      >
        {t("common.back")}
      </Link>
      <header className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold">
            {t("ops.invoices.title", {
              number: invoice.invoiceNumber ?? t("ops.invoices.draftNumber"),
            })}
          </h2>
          <p className="text-sm text-[var(--color-foreground-muted)]">
            {t("ops.invoices.period", {
              from: invoice.servicePeriodStart ? formatDate(invoice.servicePeriodStart) : "—",
              to: invoice.servicePeriodEnd ? formatDate(invoice.servicePeriodEnd) : "—",
            })}
          </p>
        </div>
        <div className="flex gap-2">
          <Badge tone="info">{statusLabel}</Badge>
        </div>
      </header>

      <Card>
        <CardContent className="grid gap-3 md:grid-cols-3 text-sm p-4">
          <Field
            label={t("billing.columns.issueDate")}
            value={invoice.issueDate ? formatDate(invoice.issueDate) : "—"}
          />
          <Field
            label={t("billing.columns.dueDate")}
            value={invoice.dueDate ? formatDate(invoice.dueDate) : "—"}
          />
          <Field label={t("ops.invoices.note")} value={invoice.note ?? "—"} />
          <Field
            label={t("billing.columns.total")}
            value={formatMoney(Number(invoice.totalAmount.toString()), invoice.currency as "EUR" | "RSD")}
          />
          <Field
            label={t("billing.columns.paid")}
            value={formatMoney(Number(invoice.amountPaid.toString()), invoice.currency as "EUR" | "RSD")}
          />
          <Field
            label={t("billing.columns.remaining")}
            value={formatMoney(Number(invoice.amountDue.toString()), invoice.currency as "EUR" | "RSD")}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("ops.invoices.items")}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-[var(--color-foreground-subtle)]">
              <tr>
                <th className="border-b border-[var(--color-border)] px-3 py-2">
                  {t("ops.invoices.description")}
                </th>
                <th className="border-b border-[var(--color-border)] px-3 py-2 text-right">
                  {t("ops.invoices.quantity")}
                </th>
                <th className="border-b border-[var(--color-border)] px-3 py-2 text-right">
                  {t("ops.invoices.unitPrice")}
                </th>
                <th className="border-b border-[var(--color-border)] px-3 py-2 text-right">
                  {t("common.amount")}
                </th>
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
            <CardTitle className="text-base">
              {t("ops.invoices.payments", { count: allocations.length })}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-[var(--color-foreground-subtle)]">
                <tr>
                  <th className="border-b border-[var(--color-border)] px-3 py-2">
                    {t("common.date")}
                  </th>
                  <th className="border-b border-[var(--color-border)] px-3 py-2">
                    {t("ops.reports.method")}
                  </th>
                  <th className="border-b border-[var(--color-border)] px-3 py-2 text-right">
                    {t("common.amount")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {allocations.map((a) => (
                  <tr key={a.id} className="border-b border-[var(--color-border)] last:border-b-0">
                    <td className="px-3 py-2 text-xs">{formatDate(a.subscriptionPayment.paidAt)}</td>
                    <td className="px-3 py-2 text-xs">
                      {(() => {
                        const key = `billing.provider.${a.subscriptionPayment.provider}` as TranslationKey;
                        const out = t(key);
                        return out === key ? a.subscriptionPayment.provider : out;
                      })()}
                    </td>
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
            {t("billing.actions.downloadPdf")}
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
