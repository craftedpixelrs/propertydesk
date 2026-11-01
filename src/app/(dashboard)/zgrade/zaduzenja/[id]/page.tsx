import Link from "next/link";
import { notFound } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PermissionGuard } from "@/components/app/permission-guard";
import { loadUserContext, requireTenantPage } from "@/server/auth/context";
import { getDuesCharge, duesChargeReference } from "@/server/services/manager/dues.service";
import { isDomainError } from "@/lib/errors";
import { formatDate, formatMoney } from "@/lib/formatters";
import { createT } from "@/lib/i18n";
import {
  RecordPaymentDialog,
  ReversePaymentButton,
  SendRemindersDialog,
  WriteOffDialog,
} from "@/features/manager/dues-actions";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function DuesDetailPage({ params }: Props) {
  const { id } = await params;
  const ctx = await loadUserContext();
  requireTenantPage(ctx, { permission: "dues.read", orgType: "MANAGER" });
  const t = createT(ctx.user.locale);

  let charge: Awaited<ReturnType<typeof getDuesCharge>>;
  try {
    charge = await getDuesCharge(ctx.activeOrganization.id, id);
  } catch (err) {
    if (isDomainError(err) && err.code === "NOT_FOUND") return notFound();
    throw err;
  }

  const owe = (Number(charge.totalAmount) - Number(charge.paidAmount)).toFixed(2);
  const reference = duesChargeReference(charge);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs text-[var(--color-foreground-muted)] uppercase">
            {t("manager.dues.title")}
          </div>
          <h1 className="text-2xl font-semibold">
            <Link href={`/zgrade/${charge.building.id}`} className="hover:underline">
              {charge.building.name}
            </Link>
            {" · "}
            <Link
              href={`/zgrade/${charge.building.id}/delovi/${charge.unit.id}`}
              className="hover:underline"
            >
              {charge.unit.code}
            </Link>
            {" · "}
            {String(charge.periodYear)}-{String(charge.periodMonth).padStart(2, "0")}
          </h1>
          <div className="text-sm text-[var(--color-foreground-muted)]">
            Rok: {formatDate(charge.dueDate)} · Status:{" "}
            {t(`manager.dues.status.${charge.status}` as const)}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={`/api/v1/manager/dues/${charge.id}/pdf`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-11 items-center rounded-lg border border-[var(--color-border-strong)] px-4 text-sm font-semibold hover:bg-[var(--color-surface-inset)]"
          >
            Uplatnica PDF
          </a>
          {charge.status !== "WRITTEN_OFF" && Number(owe) > 0 ? (
            <PermissionGuard permission="dues.payment.record">
              <RecordPaymentDialog chargeId={charge.id} remainingAmount={owe} />
            </PermissionGuard>
          ) : null}
          {charge.status !== "WRITTEN_OFF" && Number(owe) > 0 ? (
            <PermissionGuard permission="dues.writeoff">
              <WriteOffDialog chargeId={charge.id} />
            </PermissionGuard>
          ) : null}
          {charge.status !== "WRITTEN_OFF" && Number(owe) > 0 ? (
            <PermissionGuard permission="dues.reminder.send">
              <SendRemindersDialog
                buildings={[{ id: charge.building.id, name: charge.building.name }]}
                initialBuildingId={charge.building.id}
              />
            </PermissionGuard>
          ) : null}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <StatCard
          label={t("manager.dues.columns.total")}
          value={formatMoney(charge.totalAmount, "RSD")}
        />
        <StatCard
          label={t("manager.dues.columns.paid")}
          value={formatMoney(charge.paidAmount, "RSD")}
        />
        <StatCard label={t("manager.dues.columns.outstanding")} value={formatMoney(owe, "RSD")} />
        <StatCard label="Poziv na broj" value={reference ?? "—"} mono />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{t("manager.payments.historyTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          {charge.payments.length === 0 ? (
            <p className="text-sm text-[var(--color-foreground-muted)]">
              {t("manager.payments.historyEmpty")}
            </p>
          ) : (
            <table className="min-w-full divide-y divide-[var(--color-border)] text-sm">
              <thead className="text-left text-xs tracking-wide text-[var(--color-foreground-muted)] uppercase">
                <tr>
                  <th className="py-2">{t("manager.payments.paidAtField")}</th>
                  <th className="py-2 text-right">{t("manager.payments.amountField")}</th>
                  <th className="py-2">{t("manager.payments.methodField")}</th>
                  <th className="py-2">{t("manager.payments.referenceField")}</th>
                  <th className="py-2">{t("manager.payments.notesField")}</th>
                  <th className="py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {charge.payments.map((p) => (
                  <tr
                    key={p.id}
                    className={
                      p.reversed ? "text-[var(--color-foreground-muted)] line-through" : ""
                    }
                  >
                    <td className="py-2 text-xs">{formatDate(p.paidAt)}</td>
                    <td className="py-2 text-right tabular-nums">{formatMoney(p.amount, "RSD")}</td>
                    <td className="py-2 text-xs">
                      {t(
                        `manager.payments.method.${p.method as "BANK_TRANSFER" | "CARD" | "OTHER"}` as const,
                      )}
                    </td>
                    <td className="py-2 font-mono text-xs">{p.reference ?? "—"}</td>
                    <td className="py-2 text-xs">
                      {p.reversed ? (
                        <span className="rounded-full bg-neutral-200 px-2 py-0.5 text-xs">
                          {t("manager.payments.reversedBadge")}
                          {p.reversalReason ? ` · ${p.reversalReason}` : ""}
                        </span>
                      ) : (
                        (p.notes ?? "—")
                      )}
                    </td>
                    <td className="py-2 text-right">
                      {!p.reversed ? (
                        <PermissionGuard permission="dues.payment.reverse">
                          <ReversePaymentButton paymentId={p.id} />
                        </PermissionGuard>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-4 text-sm">
        <Link
          href={`/zgrade/${charge.building.id}/delovi/${charge.unit.id}`}
          className="text-[var(--color-brand-700)] hover:underline"
        >
          {t("manager.dues.openUnit")}
        </Link>
        <Link
          href={`/zgrade/${charge.building.id}/finansije`}
          className="text-[var(--color-brand-700)] hover:underline"
        >
          {t("manager.building.overview.openFinance")}
        </Link>
        <Link
          href={`/zgrade/duznici?building=${charge.building.id}`}
          className="text-[var(--color-brand-700)] hover:underline"
        >
          {t("manager.dues.openDebtors")}
        </Link>
        <Link href="/zgrade/zaduzenja" className="text-[var(--color-brand-700)] hover:underline">
          ← {t("manager.dues.title")}
        </Link>
      </div>
    </div>
  );
}

function StatCard({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <Card>
      <CardContent className="py-3">
        <div className="text-xs text-[var(--color-foreground-muted)] uppercase">{label}</div>
        <div className={`text-lg font-semibold tabular-nums ${mono ? "font-mono text-sm" : ""}`}>
          {value}
        </div>
      </CardContent>
    </Card>
  );
}
