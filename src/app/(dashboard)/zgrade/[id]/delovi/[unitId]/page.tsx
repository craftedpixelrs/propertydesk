import Link from "next/link";
import { notFound } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PermissionGuard } from "@/components/app/permission-guard";
import { loadUserContext, requireTenantPage } from "@/server/auth/context";
import { duesChargeReference } from "@/server/services/manager/dues.service";
import { loadUnitFinanceCard } from "@/server/services/manager/unit-ledger.service";
import { isDomainError } from "@/lib/errors";
import { formatDate, formatMoney } from "@/lib/formatters";
import { createT } from "@/lib/i18n";
import { AdjustmentDialog } from "@/features/manager/adjustment-dialog";
import { DocumentVisibilityButton, UploadDocumentDialog } from "@/features/manager/document-forms";
import { listDocuments } from "@/server/services/documents.service";

interface Props {
  params: Promise<{ id: string; unitId: string }>;
}

export default async function UnitFinanceCardPage({ params }: Props) {
  const { id, unitId } = await params;
  const ctx = await loadUserContext();
  requireTenantPage(ctx, { permission: "dues.read", orgType: "MANAGER" });
  const t = createT(ctx.user.locale);

  let card: Awaited<ReturnType<typeof loadUnitFinanceCard>>;
  try {
    card = await loadUnitFinanceCard({
      organizationId: ctx.activeOrganization.id,
      buildingId: id,
      unitId,
    });
  } catch (err) {
    if (isDomainError(err) && err.code === "NOT_FOUND") return notFound();
    throw err;
  }
  const unitDocs = await listDocuments({
    organizationId: ctx.activeOrganization.id,
    entityType: "ManagedUnit",
    entityId: unitId,
    page: 1,
    pageSize: 50,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs text-[var(--color-foreground-muted)] uppercase">
            {t("manager.ledger.cardTitle")}
          </div>
          <h2 className="text-xl font-semibold">
            {card.code}
            {card.archived ? (
              <span className="ml-2 text-sm font-normal text-[var(--color-foreground-muted)]">
                {t("manager.ledger.archived")}
              </span>
            ) : null}
          </h2>
          <p className="text-sm text-[var(--color-foreground-muted)]">
            {t(`manager.unitTypes.${card.type}` as const)}
            {card.entranceCode ? ` · ${t("manager.ledger.entrance")} ${card.entranceCode}` : ""}
            {card.floor != null ? ` · ${t("manager.ledger.floor")} ${card.floor}` : ""}
            {` · ${t("manager.ledger.area")} ${card.area} m² · ${t("manager.ledger.share")} ${card.share}`}
          </p>
          <p className="text-sm">
            {card.owner ?? "—"}
            {card.ownerEmail ? ` · ${card.ownerEmail}` : ""}
            {card.ownerPhone ? ` · ${card.ownerPhone}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          <Link
            href={`/zgrade/${id}/delovi`}
            className="text-[var(--color-brand-700)] hover:underline"
          >
            {t("manager.ledger.backToUnits")}
          </Link>
          <Link
            href={`/zgrade/${id}/finansije`}
            className="text-[var(--color-brand-700)] hover:underline"
          >
            {t("manager.ledger.backToFinance")}
          </Link>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
        <Stat label={t("manager.finance.totalBilled")} value={formatMoney(card.billed, "RSD")} />
        <Stat label={t("manager.ledger.cashIn")} value={formatMoney(card.paid, "RSD")} />
        <Stat
          label={t("manager.ledger.adjustments")}
          value={formatMoney(card.adjustments, "RSD")}
        />
        <Stat
          label={t("manager.ledger.debt")}
          value={formatMoney(card.debt, "RSD")}
          warn={card.debt.startsWith("-") ? false : card.debt !== "0.00"}
        />
        <Stat
          label={t("manager.ledger.spentOnUnit")}
          value={formatMoney(card.spentOnUnit, "RSD")}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{t("manager.ledger.chargesTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          {card.charges.length === 0 ? (
            <p className="text-sm text-[var(--color-foreground-muted)]">
              {t("manager.ledger.chargesEmpty")}
            </p>
          ) : (
            <div className="space-y-4">
              {card.charges.map((charge) => {
                const reference = duesChargeReference(charge);
                return (
                  <div key={charge.id} className="rounded-md border border-[var(--color-border)]">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-border)] px-3 py-2 text-sm">
                      <div>
                        <Link
                          href={`/zgrade/zaduzenja/${charge.id}`}
                          className="font-medium text-[var(--color-brand-700)] hover:underline"
                        >
                          {charge.periodYear}-{String(charge.periodMonth).padStart(2, "0")}
                        </Link>
                        <span className="ml-2 text-xs text-[var(--color-foreground-muted)]">
                          {t(`manager.dues.status.${charge.status}`)}
                          {" · "}
                          {formatDate(charge.dueDate)}
                          {reference ? ` · ${reference}` : ""}
                        </span>
                      </div>
                      <div className="text-right text-xs tabular-nums">
                        {formatMoney(charge.totalAmount, "RSD")}
                        {" · "}
                        {t("manager.dues.columns.paid")} {formatMoney(charge.paidAmount, "RSD")}
                        {" · "}
                        {t("manager.dues.columns.outstanding")}{" "}
                        {formatMoney(charge.outstanding, "RSD")}
                      </div>
                    </div>
                    {charge.payments.length === 0 ? (
                      <p className="px-3 py-2 text-xs text-[var(--color-foreground-muted)]">
                        {t("manager.ledger.paymentsEmpty")}
                      </p>
                    ) : (
                      <ul className="divide-y divide-[var(--color-border)] text-sm">
                        {charge.payments.map((payment) => (
                          <li
                            key={payment.id}
                            className="flex flex-wrap items-center justify-between gap-2 px-3 py-2"
                          >
                            <span>
                              {formatDate(payment.paidAt)}
                              {" · "}
                              {t(`manager.payments.method.${payment.method}`)}
                              {payment.reference ? ` · ${payment.reference}` : ""}
                              {payment.reversed ? ` · ${t("manager.ledger.reversed")}` : ""}
                            </span>
                            <span className="tabular-nums">
                              {formatMoney(payment.amount, "RSD")}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle className="text-sm">{t("manager.ledger.adjustmentsTitle")}</CardTitle>
          <PermissionGuard permission="dues.payment.record">
            <AdjustmentDialog unitId={card.unitId} />
          </PermissionGuard>
        </CardHeader>
        <CardContent>
          {card.adjustmentRows.length === 0 ? (
            <p className="text-sm text-[var(--color-foreground-muted)]">
              {t("manager.ledger.adjustmentsEmpty")}
            </p>
          ) : (
            <table className="min-w-full divide-y divide-[var(--color-border)] text-sm">
              <thead className="text-left text-xs tracking-wide text-[var(--color-foreground-muted)] uppercase">
                <tr>
                  <th className="py-2">{t("manager.ledger.adjustmentDate")}</th>
                  <th className="py-2">{t("manager.ledger.adjustmentReason")}</th>
                  <th className="py-2 text-right">{t("manager.ledger.adjustmentAmount")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {card.adjustmentRows.map((row) => (
                  <tr key={row.id}>
                    <td className="py-2 text-xs text-[var(--color-foreground-muted)]">
                      {formatDate(row.effectiveDate)}
                    </td>
                    <td className="py-2">{row.reason}</td>
                    <td className="py-2 text-right tabular-nums">
                      {formatMoney(row.amount, "RSD")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{t("manager.ledger.worksTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          {card.works.length === 0 ? (
            <p className="text-sm text-[var(--color-foreground-muted)]">
              {t("manager.ledger.worksEmpty")}
            </p>
          ) : (
            <div className="space-y-4">
              {card.works.map((work) => (
                <div key={work.id} className="rounded-md border border-[var(--color-border)]">
                  <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
                    <div>
                      <Link
                        href={`/zgrade/kvarovi/${work.id}`}
                        className="font-medium text-[var(--color-brand-700)] hover:underline"
                      >
                        {work.code}
                      </Link>
                      <span className="ml-2">{work.title}</span>
                      <span className="ml-2 text-xs text-[var(--color-foreground-muted)]">
                        {t(`manager.tickets.status.${work.status}`)}
                        {work.supplierName ? ` · ${work.supplierName}` : ""}
                      </span>
                    </div>
                    <span className="text-xs text-[var(--color-foreground-muted)] tabular-nums">
                      {work.actualCost ? formatMoney(work.actualCost, "RSD") : "—"}
                    </span>
                  </div>
                  {work.expenses.length > 0 ? (
                    <ul className="divide-y divide-[var(--color-border)] border-t border-[var(--color-border)] text-sm">
                      {work.expenses.map((expense) => (
                        <li
                          key={expense.id}
                          className="flex flex-wrap items-center justify-between gap-2 px-3 py-2"
                        >
                          <span>
                            {formatDate(expense.spentAt)}
                            {" · "}
                            {expense.description}
                            {" · "}
                            {t(`manager.ledger.funds.${expense.fund}`)}
                          </span>
                          <span className="tabular-nums">{formatMoney(expense.amount, "RSD")}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-sm">{t("manager.documents.title")}</CardTitle>
          <PermissionGuard permission="document.manage">
            <UploadDocumentDialog
              entityType="ManagedUnit"
              entityId={unitId}
              categories={["DUES", "OTHER", "INVOICE"]}
              defaultCategory="DUES"
            />
          </PermissionGuard>
        </CardHeader>
        <CardContent>
          {unitDocs.items.length === 0 ? (
            <p className="text-sm text-[var(--color-foreground-muted)]">
              {t("manager.documents.empty")}
            </p>
          ) : (
            <ul className="space-y-2 text-sm">
              {unitDocs.items.map((file) => (
                <li key={file.id} className="flex flex-wrap items-center justify-between gap-2">
                  <a
                    href={`/api/v1/documents/${file.id}/download`}
                    className="text-[var(--color-brand-700)] hover:underline"
                  >
                    {file.originalFileName}
                  </a>
                  <span className="text-xs text-[var(--color-foreground-muted)]">
                    {file.visibility === "RESIDENT_SHARED"
                      ? t("manager.documents.visibility.RESIDENT_SHARED")
                      : t("manager.documents.visibility.INTERNAL")}
                  </span>
                  <PermissionGuard permission="document.manage">
                    <DocumentVisibilityButton documentId={file.id} visibility={file.visibility} />
                  </PermissionGuard>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value, warn = false }: { label: string; value: string; warn?: boolean }) {
  return (
    <Card>
      <CardContent className="py-4">
        <div className="text-xs text-[var(--color-foreground-muted)] uppercase">{label}</div>
        <div className={`text-xl font-semibold tabular-nums ${warn ? "text-red-700" : ""}`}>
          {value}
        </div>
      </CardContent>
    </Card>
  );
}
