import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { loadUserContext } from "@/server/auth/context";
import { getSaleById } from "@/server/services/sales/sales.service";
import { getPaymentPlan } from "@/server/services/sales/payment-plans.service";
import { DomainError } from "@/lib/errors";
import { formatDate, formatMoney } from "@/lib/formatters";
import type { SupportedCurrency } from "@/lib/constants/app";
import { PaymentPlanForm } from "@/features/sales/payment-plan-form";
import { AddInstallmentButton } from "@/features/sales/add-installment-form";

export const dynamic = "force-dynamic";

const INSTALLMENT_LABEL: Record<string, string> = {
  UPCOMING: "Nadolazi",
  DUE: "Dospelo",
  PARTIALLY_PAID: "Delimično plaćeno",
  PAID: "Plaćeno",
  OVERDUE: "Prekoračeno",
  CANCELED: "Otkazano",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PlanPlacanjaPage({ params }: PageProps) {
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
  const plan = sale.paymentPlan
    ? await getPaymentPlan({
        organizationId: ctx.activeOrganization.id,
        planId: sale.paymentPlan.id,
      })
    : null;

  const canManage = ctx.permissions.includes("payment.manage");

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/prodaje/${sale.id}`}
          className="text-sm text-[var(--color-foreground-muted)] hover:underline"
        >
          ← Prodaja {sale.unit.code}
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">Plan plaćanja</h1>
        <p className="text-sm text-[var(--color-foreground-muted)]">
          Ukupno: {formatMoney(sale.finalPrice.toString(), currency)}
        </p>
      </div>

      {plan ? (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
            <CardTitle className="text-sm">{plan.name}</CardTitle>
            {canManage && plan.status !== "CANCELED" ? (
              <AddInstallmentButton saleId={sale.id} currency={sale.currency} />
            ) : null}
          </CardHeader>
          <CardContent className="space-y-3">
            {(() => {
              const installmentSum = plan.installments.reduce(
                (acc, i) => acc + Number(i.amount.toString()),
                0,
              );
              const finalNum = Number(sale.finalPrice.toString());
              const diff = installmentSum - finalNum;
              if (Math.abs(diff) < 0.01) return null;
              const dir = diff > 0 ? "+" : "";
              return (
                <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                  Zbir rata je{" "}
                  <strong>{formatMoney(installmentSum, currency)}</strong>,
                  ugovorena cena{" "}
                  <strong>{formatMoney(finalNum, currency)}</strong> (razlika{" "}
                  <strong>
                    {dir}
                    {formatMoney(diff, currency)}
                  </strong>
                  ).
                </div>
              );
            })()}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-[var(--color-border)] text-sm">
                <thead className="text-left text-xs uppercase tracking-wide text-[var(--color-foreground-muted)]">
                  <tr>
                    <th className="py-2 pr-3">#</th>
                    <th className="py-2 pr-3">Naziv</th>
                    <th className="py-2 pr-3">Dospeva</th>
                    <th className="py-2 pr-3 text-right">Iznos</th>
                    <th className="py-2 pr-3 text-right">Plaćeno</th>
                    <th className="py-2 pr-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {plan.installments.map((i) => (
                    <tr key={i.id}>
                      <td className="py-2 pr-3">{i.sequenceNumber}</td>
                      <td className="py-2 pr-3">{i.name}</td>
                      <td className="py-2 pr-3">{formatDate(i.dueDate)}</td>
                      <td className="py-2 pr-3 text-right font-medium">
                        {formatMoney(i.amount.toString(), currency)}
                      </td>
                      <td className="py-2 pr-3 text-right">
                        {formatMoney(i.paidAmount.toString(), currency)}
                      </td>
                      <td className="py-2 pr-3">
                        {INSTALLMENT_LABEL[i.status] ?? i.status}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : canManage ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Novi plan plaćanja</CardTitle>
          </CardHeader>
          <CardContent>
            <PaymentPlanForm
              saleId={sale.id}
              currency={sale.currency}
              finalPrice={sale.finalPrice.toString()}
              projectId={sale.projectId}
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-sm text-[var(--color-foreground-muted)]">
            Ova prodaja još nema plan plaćanja.
          </CardContent>
        </Card>
      )}

      <div>
        <Button asChild variant="outline">
          <Link href={`/prodaje/${sale.id}`}>Nazad na prodaju</Link>
        </Button>
      </div>
    </div>
  );
}
