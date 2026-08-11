import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { SaleStatus } from "@prisma/client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { loadUserContext } from "@/server/auth/context";
import { getSaleById } from "@/server/services/sales/sales.service";
import { listDocuments } from "@/server/services/documents.service";
import { listContractTemplates } from "@/server/services/sales/contracts.service";
import { DomainError } from "@/lib/errors";
import { formatDate, formatDateTime, formatMoney } from "@/lib/formatters";
import type { SupportedCurrency } from "@/lib/constants/app";
import { SaleActions } from "@/features/sales/sale-actions";
import { RecordPaymentForm } from "@/features/sales/record-payment-form";
import { PaymentRowActions } from "@/features/sales/payment-row-actions";
import { ContractSection } from "@/features/sales/contract-section";
import { SaleTaxSection } from "@/features/sales/sale-tax-section";
import { CommentThread } from "@/features/comments/comment-thread";
import {
  DocumentList,
  type DocumentItem,
} from "@/features/documents/document-list";

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
  const canManageDocs = ctx.permissions.includes("document.manage");

  const paidTotal = sale.payments
    .filter((p) => !p.reversedAt)
    .reduce((acc, p) => acc + Number(p.amount.toString()), 0);
  const finalPrice = Number(sale.finalPrice.toString());
  const remaining = Math.max(0, finalPrice - paidTotal);

  const [saleDocsResult, unitDocsResult, contractTemplates] = await Promise.all([
    listDocuments({
      organizationId: ctx.activeOrganization.id,
      entityType: "Sale",
      entityId: sale.id,
      page: 1,
      pageSize: 50,
    }),
    listDocuments({
      organizationId: ctx.activeOrganization.id,
      entityType: "Unit",
      entityId: sale.unit.id,
      excludeImages: true,
      page: 1,
      pageSize: 50,
    }),
    listContractTemplates({
      organizationId: ctx.activeOrganization.id,
      activeOnly: true,
    }),
  ]);
  const saleDocuments: DocumentItem[] = saleDocsResult.items.map((d) => ({
    id: d.id,
    originalFileName: d.originalFileName,
    mimeType: d.mimeType,
    size: d.size,
    category: d.category,
    visibility: d.visibility,
    createdAt: d.createdAt.toISOString(),
    uploadedByName: d.uploadedByUser?.name ?? null,
  }));
  const unitDocuments: DocumentItem[] = unitDocsResult.items.map((d) => ({
    id: d.id,
    originalFileName: d.originalFileName,
    mimeType: d.mimeType,
    size: d.size,
    category: d.category,
    visibility: d.visibility,
    createdAt: d.createdAt.toISOString(),
    uploadedByName: d.uploadedByUser?.name ?? null,
  }));

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
              {sale.taxAmount ? (
                <Row
                  label="Porez"
                  value={
                    <span className="text-xs text-[var(--color-foreground-muted)]">
                      {formatMoney(sale.taxAmount.toString(), currency)}
                      {sale.vatMode === "NEW_BUILD_10"
                        ? " · PDV 10%"
                        : sale.vatMode === "SECONDARY_MARKET_2_5"
                          ? " · PPAP 2,5%"
                          : ""}
                    </span>
                  }
                />
              ) : null}
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
              <CardTitle className="text-sm">Dokumenti</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <section className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-foreground-muted)]">
                    Dokumenti prodaje
                  </h3>
                  <span className="text-xs text-[var(--color-foreground-muted)]">
                    {saleDocuments.length} stavki
                  </span>
                </div>
                <DocumentList
                  entityType="Sale"
                  entityId={sale.id}
                  documents={saleDocuments}
                  category="SALE"
                  canManage={canManageDocs}
                  offerBuyerVisibility
                  emptyTitle="Nema dokumenata prodaje"
                  emptyDescription="Otpremite ugovor, aneks i drugu dokumentaciju vezanu za ovu prodaju."
                />
              </section>
              <section className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-foreground-muted)]">
                    Dokumentacija jedinice
                  </h3>
                  <Link
                    href={`/jedinice/${sale.unit.id}`}
                    className="text-xs text-[var(--color-brand-700)] hover:underline"
                  >
                    Uredi na jedinici →
                  </Link>
                </div>
                <DocumentList
                  entityType="Unit"
                  entityId={sale.unit.id}
                  documents={unitDocuments}
                  category="UNIT"
                  canManage={false}
                  hideUploadWhenNoPermission
                  emptyTitle="Nema dokumenata jedinice"
                  emptyDescription="Ugovorna dokumentacija priložena na samu jedinicu (npr. energetski pasoš, planovi) prikazuje se ovde."
                />
              </section>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
              <CardTitle className="text-sm">Uplate</CardTitle>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--color-foreground-muted)]">
                <span>
                  Ugovoreno:{" "}
                  <strong className="text-[var(--color-foreground)]">
                    {formatMoney(finalPrice, currency)}
                  </strong>
                </span>
                <span>
                  Uplaćeno:{" "}
                  <strong className="text-[var(--color-foreground)]">
                    {formatMoney(paidTotal, currency)}
                  </strong>
                </span>
                <span>
                  Preostalo:{" "}
                  <strong
                    className={
                      remaining > 0 ? "text-amber-700" : "text-emerald-700"
                    }
                  >
                    {formatMoney(remaining, currency)}
                  </strong>
                </span>
              </div>
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
              <CardTitle className="text-sm">Komentari</CardTitle>
            </CardHeader>
            <CardContent>
              <CommentThread
                entityType="Sale"
                entityId={sale.id}
                currentUserId={ctx.user.id}
              />
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

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Porez (PDV / PPAP)</CardTitle>
            </CardHeader>
            <CardContent>
              <SaleTaxSection
                saleId={sale.id}
                finalPrice={sale.finalPrice.toString()}
                currency={sale.currency}
                vatMode={sale.vatMode}
                taxAmount={sale.taxAmount?.toString() ?? null}
                taxPayer={sale.taxPayer}
                canManage={canManage}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Ugovor</CardTitle>
            </CardHeader>
            <CardContent>
              <ContractSection
                saleId={sale.id}
                contractStatus={sale.contractStatus}
                contractSentAt={sale.contractSentAt?.toISOString() ?? null}
                contractSignedAt={sale.contractSignedAt?.toISOString() ?? null}
                contractTemplateId={sale.contractTemplateId ?? null}
                templates={contractTemplates.map((t) => ({
                  id: t.id,
                  name: t.name,
                  kind: t.kind,
                }))}
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
