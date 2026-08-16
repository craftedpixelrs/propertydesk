import Link from "next/link";
import { notFound, redirect } from "next/navigation";

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
import { createT, enumLabel, type TranslateFn } from "@/lib/i18n";

export const dynamic = "force-dynamic";

function saleStatusLabel(status: string, t: TranslateFn): string {
  return enumLabel("sale", status === "PRE_CONTRACT" ? "PRECONTRACT" : status, t);
}

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

function commissionStatusLabel(status: string, t: TranslateFn): string {
  switch (status) {
    case "CALCULATED":
      return t("deals.commissionStatus.CALCULATED");
    case "APPROVED":
      return t("deals.commissionStatus.APPROVED");
    case "INVOICED":
      return t("deals.commissionStatus.INVOICED");
    case "DUE":
      return t("deals.commissionStatus.DUE");
    case "PAID":
      return t("deals.commissionStatus.PAID");
    case "DISPUTED":
      return t("deals.commissionStatus.DISPUTED");
    case "CANCELED":
      return t("deals.commissionStatus.CANCELED");
    default:
      return status;
  }
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProdajaDetaljPage({ params }: PageProps) {
  const ctx = await loadUserContext();
  if (!ctx) redirect("/sign-in");
  if (!ctx.activeOrganization) redirect("/podesavanja");

  const t = createT(ctx.user.locale);
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
            ← {t("nav.sales")}
          </Link>
          <h1 className="mt-1 text-2xl font-semibold">
            {t("deals.sales.heading", { code: sale.unit.code })}
          </h1>
          <p className="text-sm text-[var(--color-foreground-muted)]">
            {saleStatusLabel(sale.status, t)} · {sale.project.name} · {sale.buyer.firstName}{" "}
            {sale.buyer.lastName}
          </p>
        </div>
        <div className="flex gap-2">
          {sale.paymentPlan ? (
            <Button asChild variant="outline" size="sm">
              <Link href={`/prodaje/${sale.id}/plan-placanja`}>{t("deals.paymentPlan")}</Link>
            </Button>
          ) : canManagePayments && sale.status !== "CANCELED" ? (
            <Button asChild size="sm">
              <Link href={`/prodaje/${sale.id}/plan-placanja`}>{t("deals.sales.createPlan")}</Link>
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">{t("common.details")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Row
                label={t("deals.buyer")}
                value={
                  <Link
                    href={`/kupci/${sale.buyer.id}`}
                    className="text-[var(--color-brand-700)] hover:underline"
                  >
                    {sale.buyer.firstName} {sale.buyer.lastName}
                  </Link>
                }
              />
              <Row label={t("deals.unit")} value={sale.unit.code} />
              <Row label={t("units.columns.project")} value={sale.project.name} />
              <Row label={t("deals.assignedTo")} value={sale.responsibleUser?.name ?? "—"} />
              <Row label={t("deals.createdBy")} value={sale.createdByUser?.name ?? "—"} />
              <Row
                label={t("deals.source")}
                value={
                  sale.sourceType === "AGENCY"
                    ? t("organization.types.agency")
                    : t("deals.sourceInternal")
                }
              />
              <Row label={t("deals.listPrice")} value={formatMoney(sale.listPrice.toString(), currency)} />
              {sale.discountType ? (
                <Row
                  label={t("deals.discount")}
                  value={
                    sale.discountType === "PERCENTAGE"
                      ? `${sale.discountValue?.toString() ?? "0"} %`
                      : formatMoney((sale.discountValue ?? 0).toString(), currency)
                  }
                />
              ) : null}
              <Row
                label={t("deals.contractedPrice")}
                value={
                  <span className="text-base font-semibold">
                    {formatMoney(sale.finalPrice.toString(), currency)}
                  </span>
                }
              />
              {sale.taxAmount ? (
                <Row
                  label={t("deals.sales.tax")}
                  value={
                    <span className="text-xs text-[var(--color-foreground-muted)]">
                      {formatMoney(sale.taxAmount.toString(), currency)}
                      {sale.vatMode === "NEW_BUILD_10"
                        ? ` · ${t("deals.sales.vat10")}`
                        : sale.vatMode === "SECONDARY_MARKET_2_5"
                          ? ` · ${t("deals.sales.ppap25")}`
                          : ""}
                    </span>
                  }
                />
              ) : null}
              <Row label={t("deals.paid")} value={formatMoney(paidTotal, currency)} />
              <Row label={t("deals.remaining")} value={formatMoney(remaining, currency)} />
              {sale.contractDate ? (
                <Row label={t("deals.contractDate")} value={formatDate(sale.contractDate)} />
              ) : null}
              {sale.actualHandoverDate ? (
                <Row label={t("deals.handover")} value={formatDate(sale.actualHandoverDate)} />
              ) : null}
              {sale.notes ? <Row label={t("common.notes")} value={sale.notes} /> : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">{t("nav.documents")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <section className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-foreground-muted)]">
                    {t("deals.sales.saleDocuments")}
                  </h3>
                  <span className="text-xs text-[var(--color-foreground-muted)]">
                    {t("deals.sales.itemCount", { count: saleDocuments.length })}
                  </span>
                </div>
                <DocumentList
                  entityType="Sale"
                  entityId={sale.id}
                  documents={saleDocuments}
                  category="SALE"
                  canManage={canManageDocs}
                  offerBuyerVisibility
                  emptyTitle={t("deals.sales.saleDocsEmptyTitle")}
                  emptyDescription={t("deals.sales.saleDocsEmptyHint")}
                />
              </section>
              <section className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-foreground-muted)]">
                    {t("deals.sales.unitDocuments")}
                  </h3>
                  <Link
                    href={`/jedinice/${sale.unit.id}`}
                    className="text-xs text-[var(--color-brand-700)] hover:underline"
                  >
                    {t("deals.sales.editOnUnit")}
                  </Link>
                </div>
                <DocumentList
                  entityType="Unit"
                  entityId={sale.unit.id}
                  documents={unitDocuments}
                  category="UNIT"
                  canManage={false}
                  hideUploadWhenNoPermission
                  emptyTitle={t("deals.sales.unitDocsEmptyTitle")}
                  emptyDescription={t("deals.sales.unitDocsEmptyHint")}
                />
              </section>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
              <CardTitle className="text-sm">{t("nav.payments")}</CardTitle>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--color-foreground-muted)]">
                <span>
                  {t("deals.contracted")}:{" "}
                  <strong className="text-[var(--color-foreground)]">
                    {formatMoney(finalPrice, currency)}
                  </strong>
                </span>
                <span>
                  {t("deals.paid")}:{" "}
                  <strong className="text-[var(--color-foreground)]">
                    {formatMoney(paidTotal, currency)}
                  </strong>
                </span>
                <span>
                  {t("deals.remainingLabel")}:{" "}
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
                  {t("deals.sales.noPayments")}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-[var(--color-border)] text-sm">
                    <thead className="text-left text-xs uppercase tracking-wide text-[var(--color-foreground-muted)]">
                      <tr>
                        <th className="py-2 pr-3">{t("common.date")}</th>
                        <th className="py-2 pr-3">{t("common.amount")}</th>
                        <th className="py-2 pr-3">{t("deals.method")}</th>
                        <th className="py-2 pr-3">{t("deals.reference")}</th>
                        <th className="py-2 pr-3 text-right">{t("common.actions")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-border)]">
                      {sale.payments.map((p) => (
                        <tr key={p.id} className={p.reversedAt ? "opacity-60" : ""}>
                          <td className="py-2 pr-3">{formatDate(p.paymentDate)}</td>
                          <td className="py-2 pr-3 font-medium">
                            {formatMoney(p.amount.toString(), currency)}
                          </td>
                          <td className="py-2 pr-3">
                            {paymentMethodLabel(p.paymentMethod, t)}
                          </td>
                          <td className="py-2 pr-3 text-xs text-[var(--color-foreground-muted)]">
                            {p.referenceNumber ?? "—"}
                          </td>
                          <td className="py-2 pr-3 text-right">
                            {canManagePayments ? (
                              <PaymentRowActions paymentId={p.id} reversed={Boolean(p.reversedAt)} />
                            ) : p.reversedAt ? (
                              <span className="text-xs text-[var(--color-foreground-muted)]">
                                {t("deals.reversed")}
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
                  <h3 className="mb-2 text-sm font-medium">{t("deals.sales.newPayment")}</h3>
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
              <CardTitle className="text-sm">{t("deals.comments")}</CardTitle>
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
              <CardTitle className="text-sm">{t("deals.statusHistory")}</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                {sale.statusHistory.map((h) => (
                  <li
                    key={h.id}
                    className="flex items-center justify-between border-b border-[var(--color-border)] pb-2 last:border-0"
                  >
                    <span>
                      {saleStatusLabel(h.previousStatus, t)} → {saleStatusLabel(h.newStatus, t)}
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
              <CardTitle className="text-sm">{t("common.actions")}</CardTitle>
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
              <CardTitle className="text-sm">{t("deals.sales.taxSection")}</CardTitle>
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
              <CardTitle className="text-sm">{t("deals.sales.contract")}</CardTitle>
            </CardHeader>
            <CardContent>
              <ContractSection
                saleId={sale.id}
                contractStatus={sale.contractStatus}
                contractSentAt={sale.contractSentAt?.toISOString() ?? null}
                contractSignedAt={sale.contractSignedAt?.toISOString() ?? null}
                contractTemplateId={sale.contractTemplateId ?? null}
                templates={contractTemplates.map((tmpl) => ({
                  id: tmpl.id,
                  name: tmpl.name,
                  kind: tmpl.kind,
                }))}
                canManage={canManage}
              />
            </CardContent>
          </Card>

          {sale.commission ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">{t("deals.sales.agencyCommission")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <Row
                  label={t("common.statusLabel")}
                  value={commissionStatusLabel(sale.commission.status, t)}
                />
                <Row
                  label={t("common.amount")}
                  value={formatMoney(
                    (sale.commission.adjustedAmount ?? sale.commission.calculatedAmount).toString(),
                    sale.commission.currency as SupportedCurrency,
                  )}
                />
                <Row
                  label={t("deals.sales.commissionBase")}
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
