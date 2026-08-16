import Link from "next/link";
import { requireSuperAdmin } from "@/server/permissions/require";
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
] as const satisfies InvoiceStatus[];

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
  const t = createT(await resolveRequestLocale());
  const sp = await searchParams;
  const page = Number.parseInt(sp.page ?? "1", 10) || 1;
  const status = sp.status ? (sp.status as InvoiceStatus) : undefined;
  const { items, total } = await listInvoices({ page, pageSize: 50, status });

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">{t("admin.invoices.title", { total })}</h2>
        <form className="flex items-center gap-2" action="/administracija/naplata/fakture">
          <select
            name="status"
            defaultValue={sp.status ?? ""}
            className="h-9 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm"
          >
            <option value="">{t("common.allStatuses")}</option>
            {INVOICE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {t(`billing.invoiceStatus.${s}` as TranslationKey)}
              </option>
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
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-[var(--color-foreground-subtle)]">
                <tr>
                  <th className="border-b border-[var(--color-border)] px-3 py-2">
                    {t("billing.columns.invoiceNumber")}
                  </th>
                  <th className="border-b border-[var(--color-border)] px-3 py-2">
                    {t("common.statusLabel")}
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
                      {t("admin.invoices.empty")}
                    </td>
                  </tr>
                ) : (
                  items.map((inv) => (
                    <tr key={inv.id} className="border-b border-[var(--color-border)] last:border-b-0">
                      <td className="px-3 py-2 font-mono text-xs">
                        <Link href={`/administracija/naplata/fakture/${inv.id}`} className="text-[var(--color-brand-700)] hover:underline">
                          {inv.invoiceNumber ?? t("admin.draftParen")}
                        </Link>
                      </td>
                      <td className="px-3 py-2">
                        <Badge tone={STATUS_TONE[inv.status]}>
                          {t(`billing.invoiceStatus.${inv.status}` as TranslationKey)}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 text-xs">
                        {inv.issueDate ? formatDate(inv.issueDate) : t("admin.dash")}
                      </td>
                      <td className="px-3 py-2 text-xs">
                        {inv.dueDate ? formatDate(inv.dueDate) : t("admin.dash")}
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
