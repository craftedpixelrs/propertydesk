import { notFound } from "next/navigation";
import { requireSuperAdmin } from "@/server/permissions/require";
import { getInvoiceWithItems } from "@/server/services/billing/invoices/service";
import { prisma } from "@/server/db/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/formatters/date";
import { formatMoney } from "@/lib/formatters/money";
import Link from "next/link";
import { createT, type TranslationKey } from "@/lib/i18n";
import { resolveRequestLocale } from "@/lib/i18n/resolve-locale";

export const dynamic = "force-dynamic";

export default async function AdminInvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireSuperAdmin();
  const t = createT(await resolveRequestLocale());
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

  const periodValue = invoice.servicePeriodStart
    ? `${formatDate(invoice.servicePeriodStart)} — ${invoice.servicePeriodEnd ? formatDate(invoice.servicePeriodEnd) : t("admin.dash")}`
    : t("admin.dash");

  return (
    <section className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">
            {t("admin.invoiceDetail.title", {
              number: invoice.invoiceNumber ?? t("admin.draftParen"),
            })}
          </h2>
          <p className="text-sm text-[var(--color-foreground-muted)]">
            {org ? (
              <Link href={`/administracija/organizacije`} className="hover:underline">
                {org.name}
              </Link>
            ) : t("admin.dash")}
          </p>
        </div>
        <div className="flex gap-2">
          <Badge tone="info">
            {t(`billing.invoiceStatus.${invoice.status}` as TranslationKey)}
          </Badge>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("common.details")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3 text-sm">
          <Row
            label={t("admin.invoiceDetail.issueDate")}
            value={invoice.issueDate ? formatDate(invoice.issueDate) : t("admin.dash")}
          />
          <Row
            label={t("admin.invoiceDetail.dueDate")}
            value={invoice.dueDate ? formatDate(invoice.dueDate) : t("admin.dash")}
          />
          <Row label={t("billing.columns.period")} value={periodValue} />
          <Row
            label={t("billing.columns.total")}
            value={formatMoney(Number(invoice.totalAmount.toString()), invoice.currency as "EUR" | "RSD")}
          />
          <Row
            label={t("billing.columns.paid")}
            value={formatMoney(Number(invoice.amountPaid.toString()), invoice.currency as "EUR" | "RSD")}
          />
          <Row
            label={t("billing.columns.remaining")}
            value={formatMoney(Number(invoice.amountDue.toString()), invoice.currency as "EUR" | "RSD")}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("admin.invoiceDetail.items")}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-[var(--color-foreground-subtle)]">
              <tr>
                <th className="border-b border-[var(--color-border)] px-3 py-2">
                  {t("admin.invoiceDetail.description")}
                </th>
                <th className="border-b border-[var(--color-border)] px-3 py-2 text-right">
                  {t("admin.invoiceDetail.quantity")}
                </th>
                <th className="border-b border-[var(--color-border)] px-3 py-2 text-right">
                  {t("admin.invoiceDetail.unitPrice")}
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {t("admin.invoiceDetail.payments", { count: payments.length })}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {payments.length === 0 ? (
            <p className="p-4 text-sm text-[var(--color-foreground-muted)]">
              {t("admin.invoiceDetail.noPayments")}
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-[var(--color-foreground-subtle)]">
                <tr>
                  <th className="border-b border-[var(--color-border)] px-3 py-2">
                    {t("common.date")}
                  </th>
                  <th className="border-b border-[var(--color-border)] px-3 py-2">
                    {t("admin.invoiceDetail.method")}
                  </th>
                  <th className="border-b border-[var(--color-border)] px-3 py-2 text-right">
                    {t("common.amount")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {payments.map((a) => (
                  <tr key={a.id} className="border-b border-[var(--color-border)] last:border-b-0">
                    <td className="px-3 py-2 text-xs">{formatDate(a.subscriptionPayment.paidAt)}</td>
                    <td className="px-3 py-2 text-xs">
                      {t(`billing.provider.${a.subscriptionPayment.provider}` as TranslationKey)}
                    </td>
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
          {t("billing.actions.downloadPdf")}
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
