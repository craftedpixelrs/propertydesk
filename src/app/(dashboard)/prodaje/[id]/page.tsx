import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { SaleStatus } from "@prisma/client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { loadUserContext } from "@/server/auth/context";
import { getSaleById } from "@/server/services/sales/sales.service";
import { DomainError } from "@/lib/errors";
import { formatDate, formatDateTime, formatMoney } from "@/lib/formatters";
import type { SupportedCurrency } from "@/lib/constants/app";
import { SaleActions } from "@/features/sales/sale-actions";
import { RecordPaymentForm } from "@/features/sales/record-payment-form";
import { PaymentRowActions } from "@/features/sales/payment-row-actions";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<SaleStatus, string> = {
  DRAFT: "Nacrt",
  PRE_CONTRACT: "Predugovor",
  CONTRACTED: "Ugovorena",
  PAYMENT_IN_PROGRESS: "Plaćanje u toku",
  PAID: "Plaćena",
  HANDED_OVER: "Primopredato",
  CANCELED: "Otkazana",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProdajaDetaljPage({ params }: PageProps) {
  const ctx = await loadUserContext();
  if (!ctx) redirect("/sign-in");
  if (!ctx.activeOrganization) redirect("/podesavanja");

  const { id } = await params;
  let sale;
  try {
    sale = await getSaleById(ctx.activeOrganization.id, id);
  } catch (err) {
    if (err instanceof DomainError && err.code === "NOT_FOUND") notFound();
    throw err;
  }

  const currency = sale.currency as SupportedCurrency;
  const canManage = ctx.permissions.includes("sale.manage");
  const canManagePayments = ctx.permissions.includes("payment.manage");

  const paidTotal = sale.payments
    .filter((p) => !p.reversedAt)
    .reduce((acc, p) => acc + Number(p.amount.toString()), 0);
  const finalPrice = Number(sale.finalPrice.toString());
  const remaining = Math.max(0, finalPrice - paidTotal);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href="/prodaje"
            className="text-sm text-[var(--color-foreground-muted)] hover:underline"
          >
            ← Prodaje
          </Link>
          <h1 className="mt-1 text-2xl font-semibold">Prodaja · {sale.unit.code}</h1>
          <p className="text-sm text-[var(--color-foreground-muted)]">
            {STATUS_LABELS[sale.status]} · {sale.project.name} · {sale.buyer.firstName}{" "}
            {sale.buyer.lastName}
          </p>
        </div>
        <div className="flex gap-2">
          {sale.paymentPlan ? (
            <Button asChild variant="outline" size="sm">
              <Link href={`/prodaje/${sale.id}/plan-placanja`}>Plan plaćanja</Link>
            </Button>
          ) : canManagePayments && sale.status !== "CANCELED" ? (
            <Button asChild size="sm">
              <Link href={`/prodaje/${sale.id}/plan-placanja`}>Kreiraj plan</Link>
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Detalji</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Row
                label="Kupac"
                value={
                  <Link
                    href={`/kupci/${sale.buyer.id}`}
                    className="text-[var(--color-brand-700)] hover:underline"
                  >
                    {sale.buyer.firstName} {sale.buyer.lastName}
                  </Link>
                }
              />
              <Row label="Jedinica" value={sale.unit.code} />
              <Row label="Projekat" value={sale.project.name} />
              <Row label="Zadužen" value={sale.responsibleUser?.name ?? "—"} />
              <Row label="Kreirao" value={sale.createdByUser?.name ?? "—"} />
              <Row label="Izvor" value={sale.sourceType === "AGENCY" ? "Agencija" : "Interno"} />
              <Row label="Cena po ceniku" value={formatMoney(sale.listPrice.toString(), currency)} />
              {sale.discountType ? (
                <Row
                  label="Popust"
                  value={
                    sale.discountType === "PERCENTAGE"
                      ? `${sale.discountValue?.toString() ?? "0"} %`
                      : formatMoney((sale.discountValue ?? 0).toString(), currency)
                  }
                />
              ) : null}
              <Row
                label="Ugovorena cena"
                value={
                  <span className="text-base font-semibold">
                    {formatMoney(sale.finalPrice.toString(), currency)}
                  </span>
                }
              />
              <Row label="Uplaćeno" value={formatMoney(paidTotal, currency)} />
              <Row label="Ostatak" value={formatMoney(remaining, currency)} />
              {sale.contractDate ? (
                <Row label="Datum ugovora" value={formatDate(sale.contractDate)} />
              ) : null}
              {sale.actualHandoverDate ? (
                <Row label="Primopredaja" value={formatDate(sale.actualHandoverDate)} />
              ) : null}
              {sale.notes ? <Row label="Napomena" value={sale.notes} /> : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Uplate</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {sale.payments.length === 0 ? (
                <p className="text-sm text-[var(--color-foreground-muted)]">
                  Nema evidentiranih uplata.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-[var(--color-border)] text-sm">
                    <thead className="text-left text-xs uppercase tracking-wide text-[var(--color-foreground-muted)]">
                      <tr>
                        <th className="py-2 pr-3">Datum</th>
                        <th className="py-2 pr-3">Iznos</th>
                        <th className="py-2 pr-3">Način</th>
                        <th className="py-2 pr-3">Poziv na broj</th>
                        <th className="py-2 pr-3 text-right">Radnje</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-border)]">
                      {sale.payments.map((p) => (
                        <tr key={p.id} className={p.reversedAt ? "opacity-60" : ""}>
                          <td className="py-2 pr-3">{formatDate(p.paymentDate)}</td>
                          <td className="py-2 pr-3 font-medium">
                            {formatMoney(p.amount.toString(), currency)}
                          </td>
                          <td className="py-2 pr-3">{p.paymentMethod}</td>
                          <td className="py-2 pr-3 text-xs text-[var(--color-foreground-muted)]">
                            {p.referenceNumber ?? "—"}
                          </td>
                          <td className="py-2 pr-3 text-right">
                            {canManagePayments ? (
                              <PaymentRowActions paymentId={p.id} reversed={Boolean(p.reversedAt)} />
                            ) : p.reversedAt ? (
                              <span className="text-xs text-[var(--color-foreground-muted)]">
                                Stornirano
                              </span>
                            ) : null}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {canManagePayments && sale.status !== "CANCELED" ? (
                <div className="rounded-md border border-[var(--color-border)] p-3">
                  <h3 className="mb-2 text-sm font-medium">Nova uplata</h3>
                  <RecordPaymentForm
                    saleId={sale.id}
                    currency={sale.currency}
                    installments={
                      sale.paymentPlan?.installments.map((i) => ({
                        id: i.id,
                        name: i.name,
                        amount: formatMoney(i.amount.toString(), currency),
                        status: i.status,
                      })) ?? []
                    }
                  />
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Istorija statusa</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                {sale.statusHistory.map((h) => (
                  <li
                    key={h.id}
                    className="flex items-center justify-between border-b border-[var(--color-border)] pb-2 last:border-0"
                  >
                    <span>
                      {STATUS_LABELS[h.previousStatus]} → {STATUS_LABELS[h.newStatus]}
                      {h.reason ? (
                        <span className="text-[var(--color-foreground-muted)]"> · {h.reason}</span>
                      ) : null}
                    </span>
                    <span className="text-xs text-[var(--color-foreground-subtle)]">
                      {formatDateTime(h.changedAt)}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Radnje</CardTitle>
            </CardHeader>
            <CardContent>
              <SaleActions
                saleId={sale.id}
                status={sale.status}
                version={sale.version}
                canManage={canManage}
              />
            </CardContent>
          </Card>

          {sale.commission ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Provizija agenciji</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <Row label="Status" value={sale.commission.status} />
                <Row
                  label="Iznos"
                  value={formatMoney(
                    (sale.commission.adjustedAmount ?? sale.commission.calculatedAmount).toString(),
                    sale.commission.currency as SupportedCurrency,
                  )}
                />
                <Row
                  label="Osnovica"
                  value={formatMoney(
                    sale.commission.baseAmount.toString(),
                    sale.commission.currency as SupportedCurrency,
                  )}
                />
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[var(--color-foreground-muted)]">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
