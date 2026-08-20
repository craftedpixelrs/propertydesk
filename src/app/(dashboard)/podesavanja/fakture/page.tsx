import Link from "next/link";
import { redirect } from "next/navigation";
import { requirePermission } from "@/server/permissions/require";
import { listInvoices } from "@/server/services/billing/invoices/service";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/formatters/date";
import { formatMoney } from "@/lib/formatters/money";
import type { InvoiceStatus } from "@prisma/client";
import { createT, type TranslationKey } from "@/lib/i18n";
import { resolveRequestLocale } from "@/lib/i18n/resolve-locale";

export const dynamic = "force-dynamic";

const INVOICE_STATUSES = [
  "DRAFT",
  "ISSUED",
  "SENT",
  "PARTIALLY_PAID",
  "PAID",
  "OVERDUE",
  "CANCELED",
  "VOID",
] as const satisfies readonly InvoiceStatus[];

interface PageProps {
  searchParams: Promise<{ page?: string; status?: string }>;
}

export default async function TenantInvoicesPage({ searchParams }: PageProps) {
  const ctx = await requirePermission("billing.invoice.read");
  if (ctx.organization.organizationType === "AGENCY") {
    redirect("/podesavanja/organizacija");
  }
  const t = createT(await resolveRequestLocale());
  const sp = await searchParams;
  const page = Number.parseInt(sp.page ?? "1", 10) || 1;
  const status = sp.status ? (sp.status as InvoiceStatus) : undefined;
  const { items, total } = await listInvoices({
    page,
    pageSize: 50,
    organizationId: ctx.organization.organizationId,
    status,
  });

  function invoiceStatusLabel(value: InvoiceStatus) {
    const key = `billing.invoiceStatus.${value}` as TranslationKey;
    const out = t(key);
    return out === key ? value : out;
  }

  return (
    <section className="space-y-4">
      <Link
        href="/dashboard"
        className="text-sm text-[var(--color-brand-700)] hover:underline"
      >
        {t("common.back")}
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">{t("ops.invoices.myInvoices", { total })}</h2>
          <p className="text-sm text-[var(--color-foreground-muted)]">
            {t("ops.invoices.subtitle")}
          </p>
        </div>
        <form className="flex items-center gap-2" action="/podesavanja/fakture">
          <select
            name="status"
            defaultValue={sp.status ?? ""}
            className="h-9 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm"
          >
            <option value="">{t("common.allStatuses")}</option>
            {INVOICE_STATUSES.map((s) => (
              <option key={s} value={s}>{invoiceStatusLabel(s)}</option>
            ))}
          </select>
          <button
            type="submit"
            className="h-9 rounded-md border border-[var(--color-border)] px-3 text-sm hover:bg-[var(--color-surface-hover)]"
          >
            {t("common.apply")}
          </button>
        </form>
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-[var(--color-foreground-subtle)]">
              <tr>
                <th className="border-b border-[var(--color-border)] px-3 py-2">
                  {t("billing.columns.invoiceNumber")}
                </th>
                <th className="border-b border-[var(--color-border)] px-3 py-2">
                  {t("billing.columns.status")}
                </th>
                <th className="border-b border-[var(--color-border)] px-3 py-2">
                  {t("billing.columns.issueDate")}
                </th>
                <th className="border-b border-[var(--color-border)] px-3 py-2">
                  {t("billing.columns.dueDate")}
                </th>
                <th className="border-b border-[var(--color-border)] px-3 py-2 text-right">
                  {t("billing.columns.total")}
                </th>
                <th className="border-b border-[var(--color-border)] px-3 py-2 text-right">
                  {t("billing.columns.remaining")}
                </th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-[var(--color-foreground-muted)]">
                    {t("ops.invoices.empty")}
                  </td>
                </tr>
              ) : (
                items.map((inv) => (
                  <tr key={inv.id} className="border-b border-[var(--color-border)] last:border-b-0">
                    <td className="px-3 py-2 font-mono text-xs">
                      <Link href={`/podesavanja/fakture/${inv.id}`} className="text-[var(--color-brand-700)] hover:underline">
                        {inv.invoiceNumber ?? t("ops.invoices.draftNumber")}
                      </Link>
                    </td>
                    <td className="px-3 py-2">
                      <Badge tone={inv.status === "PAID" ? "success" : inv.status === "OVERDUE" ? "danger" : "info"}>
                        {invoiceStatusLabel(inv.status)}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-xs">{inv.issueDate ? formatDate(inv.issueDate) : "—"}</td>
                    <td className="px-3 py-2 text-xs">{inv.dueDate ? formatDate(inv.dueDate) : "—"}</td>
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
        </CardContent>
      </Card>
    </section>
  );
}
