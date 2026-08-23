import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { loadUserContext, requireTenantPage } from "@/server/auth/context";
import { listPayments } from "@/server/services/sales/payments.service";
import { formatDate, formatMoney } from "@/lib/formatters";
import type { SupportedCurrency } from "@/lib/constants/app";
import { createT, type TranslateFn } from "@/lib/i18n";

export const dynamic = "force-dynamic";

function paymentMethodLabel(method: string, t: TranslateFn): string {
  switch (method) {
    case "BANK_TRANSFER":
      return t("deals.paymentMethod.BANK_TRANSFER");
    case "CASH":
      return t("deals.paymentMethod.CASH");
    case "CARD":
      return t("deals.paymentMethod.CARD");
    case "LOAN":
      return t("deals.paymentMethod.LOAN");
    case "COMPENSATION":
      return t("deals.paymentMethod.COMPENSATION");
    case "OTHER":
      return t("deals.paymentMethod.OTHER");
    default:
      return method;
  }
}

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function readParam(raw: string | string[] | undefined): string | undefined {
  return Array.isArray(raw) ? raw[0] : raw;
}

export default async function UplatePage({ searchParams }: PageProps) {
  const ctx = await loadUserContext();
  requireTenantPage(ctx, { permission: "payment.read", orgType: "INVESTOR" });

  const t = createT(ctx.user.locale);
  const sp = await searchParams;
  const page = Number(readParam(sp.page) ?? "1") || 1;
  const pageSize = 20;

  const { items, total } = await listPayments({
    organizationId: ctx.activeOrganization.id,
    page,
    pageSize,
  });
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("nav.payments")}</h1>
        <p className="text-sm text-[var(--color-foreground-muted)]">
          {t("deals.payments.subtitle")}
        </p>
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-[var(--color-foreground-muted)]">
            {t("deals.payments.empty")}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t("deals.payments.recent")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-[var(--color-border)] text-sm">
                <thead className="text-left text-xs uppercase tracking-wide text-[var(--color-foreground-muted)]">
                  <tr>
                    <th className="py-2 pr-3">{t("common.date")}</th>
                    <th className="py-2 pr-3">{t("deals.unit")}</th>
                    <th className="py-2 pr-3">{t("deals.buyer")}</th>
                    <th className="py-2 pr-3">{t("deals.method")}</th>
                    <th className="py-2 pr-3 text-right">{t("common.amount")}</th>
                    <th className="py-2 pr-3">{t("common.statusLabel")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {items.map((p) => (
                    <tr key={p.id} className={p.reversedAt ? "opacity-60" : ""}>
                      <td className="py-2 pr-3">{formatDate(p.paymentDate)}</td>
                      <td className="py-2 pr-3">
                        <Link
                          href={`/prodaje/${p.saleId}`}
                          className="text-[var(--color-brand-700)] hover:underline"
                        >
                          {p.sale?.unit?.code ?? "—"}
                        </Link>
                      </td>
                      <td className="py-2 pr-3">
                        {p.sale?.buyer
                          ? `${p.sale.buyer.firstName} ${p.sale.buyer.lastName}`
                          : "—"}
                      </td>
                      <td className="py-2 pr-3">
                        {paymentMethodLabel(p.paymentMethod, t)}
                      </td>
                      <td className="py-2 pr-3 text-right font-medium">
                        {formatMoney(p.amount.toString(), p.currency as SupportedCurrency)}
                      </td>
                      <td className="py-2 pr-3">
                        {p.reversedAt ? t("deals.reversed") : t("deals.payments.active")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {totalPages > 1 ? (
        <div className="flex items-center justify-between text-sm">
          <span className="text-[var(--color-foreground-muted)]">
            {t("deals.pageOf", { page, total: totalPages })}
          </span>
          <div className="flex gap-2">
            {page > 1 ? (
              <Button asChild variant="outline" size="sm">
                <Link href={{ pathname: "/uplate", query: { page: String(page - 1) } }}>
                  {t("common.previous")}
                </Link>
              </Button>
            ) : null}
            {page < totalPages ? (
              <Button asChild variant="outline" size="sm">
                <Link href={{ pathname: "/uplate", query: { page: String(page + 1) } }}>
                  {t("common.next")}
                </Link>
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
