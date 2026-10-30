import Link from "next/link";
import Decimal from "decimal.js";
import type { BuildingExpenseFund } from "@prisma/client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PermissionGuard } from "@/components/app/permission-guard";
import { loadUserContext, requireTenantPage } from "@/server/auth/context";
import { prisma } from "@/server/db/prisma";
import { assertBuildingBelongsToOrg } from "@/server/services/manager/buildings.service";
import { expenseSummaryByFund, listSuppliers } from "@/server/services/manager/maintenance.service";
import { listDuesTariffs } from "@/server/services/manager/dues.service";
import { formatDate, formatMoney } from "@/lib/formatters";
import { createT } from "@/lib/i18n";
import {
  GenerateDuesDialog,
  NewTariffDialog,
  TariffToggleButton,
} from "@/features/manager/tariff-forms";
import {
  NewExpenseDialog,
  ImportBankStatementDialog,
  SendRemindersDialog,
} from "@/features/manager/dues-actions";

interface Props {
  params: Promise<{ id: string }>;
}

const FUND_LABEL_SR: Record<BuildingExpenseFund, string> = {
  CURRENT_MAINTENANCE: "Tekuće održavanje",
  INVESTMENT_FUND: "Investicioni fond",
  OTHER: "Ostalo",
};

export default async function BuildingFinanceTab({ params }: Props) {
  const { id } = await params;
  const ctx = await loadUserContext();
  requireTenantPage(ctx, { permission: "building.read", orgType: "MANAGER" });
  const t = createT(ctx.user.locale);
  await assertBuildingBelongsToOrg(ctx.activeOrganization.id, id);

  const [tariffs, charges, expenses, expenseSummary, suppliers] = await Promise.all([
    listDuesTariffs(ctx.activeOrganization.id, id),
    prisma.duesCharge.findMany({
      where: { organizationId: ctx.activeOrganization.id, buildingId: id },
      select: {
        id: true,
        periodYear: true,
        periodMonth: true,
        totalAmount: true,
        paidAmount: true,
        status: true,
        dueDate: true,
        unit: { select: { code: true } },
      },
      orderBy: [{ dueDate: "desc" }],
      take: 50,
    }),
    prisma.buildingExpense.findMany({
      where: { organizationId: ctx.activeOrganization.id, buildingId: id },
      include: { supplier: { select: { id: true, name: true } } },
      orderBy: { spentAt: "desc" },
      take: 50,
    }),
    expenseSummaryByFund({ organizationId: ctx.activeOrganization.id, buildingId: id }),
    listSuppliers({ organizationId: ctx.activeOrganization.id, buildingId: id }),
  ]);

  let billed = new Decimal(0);
  let collected = new Decimal(0);
  for (const c of charges) {
    billed = billed.plus(new Decimal(c.totalAmount.toString()));
    collected = collected.plus(new Decimal(c.paidAmount.toString()));
  }
  const outstanding = billed.minus(collected);
  const buildingList = [{ id, name: "" }];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-end gap-2">
        <PermissionGuard permission="dues.generate">
          <GenerateDuesDialog buildingId={id} />
        </PermissionGuard>
        <PermissionGuard permission="dues.bankstatement.import">
          <ImportBankStatementDialog buildings={buildingList} />
        </PermissionGuard>
        <PermissionGuard permission="dues.reminder.send">
          <SendRemindersDialog buildings={buildingList} />
        </PermissionGuard>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <StatCard
          label={t("manager.finance.totalBilled")}
          value={formatMoney(billed.toFixed(2), "RSD")}
        />
        <StatCard
          label={t("manager.finance.totalCollected")}
          value={formatMoney(collected.toFixed(2), "RSD")}
        />
        <StatCard
          label={t("manager.finance.totalOutstanding")}
          value={formatMoney(outstanding.toFixed(2), "RSD")}
          tone={outstanding.gt(0) ? "warn" : "ok"}
        />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle className="text-sm">{t("manager.finance.tariffsTitle")}</CardTitle>
          <PermissionGuard permission="dues.tariff.manage">
            <NewTariffDialog buildingId={id} />
          </PermissionGuard>
        </CardHeader>
        <CardContent>
          {tariffs.length === 0 ? (
            <p className="text-sm text-[var(--color-foreground-muted)]">
              {t("manager.tariffs.empty")}
            </p>
          ) : (
            <table className="min-w-full divide-y divide-[var(--color-border)] text-sm">
              <thead className="text-left text-xs tracking-wide text-[var(--color-foreground-muted)] uppercase">
                <tr>
                  <th className="py-2">{t("manager.tariffs.columns.name")}</th>
                  <th className="py-2">{t("manager.tariffs.columns.kind")}</th>
                  <th className="py-2">{t("manager.tariffs.columns.basis")}</th>
                  <th className="py-2 text-right">{t("manager.tariffs.columns.amount")}</th>
                  <th className="py-2">{t("manager.tariffs.columns.effective")}</th>
                  <th className="py-2">{t("manager.tariffs.columns.active")}</th>
                  <th className="py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {tariffs.map((tr) => (
                  <tr key={tr.id}>
                    <td className="py-2">{tr.name}</td>
                    <td className="py-2 text-xs">
                      {t(`manager.tariffs.kinds.${tr.kind}` as const)}
                    </td>
                    <td className="py-2 text-xs">
                      {t(`manager.tariffs.basis.${tr.basis}` as const)}
                    </td>
                    <td className="py-2 text-right tabular-nums">
                      {Number(tr.amount).toFixed(2)} {tr.currency}
                    </td>
                    <td className="py-2 text-xs text-[var(--color-foreground-muted)]">
                      {formatDate(tr.effectiveFrom)}
                    </td>
                    <td className="py-2 text-xs">{tr.active ? "✅" : "—"}</td>
                    <td className="py-2 text-right">
                      <PermissionGuard permission="dues.tariff.manage">
                        <TariffToggleButton tariffId={tr.id} active={tr.active} label={tr.name} />
                      </PermissionGuard>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle className="text-sm">{t("manager.dues.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          {charges.length === 0 ? (
            <p className="text-sm text-[var(--color-foreground-muted)]">
              {t("manager.dues.empty")}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-[var(--color-border)] text-sm">
                <thead className="text-left text-xs tracking-wide text-[var(--color-foreground-muted)] uppercase">
                  <tr>
                    <th className="py-2">{t("manager.dues.columns.unit")}</th>
                    <th className="py-2">{t("manager.dues.columns.period")}</th>
                    <th className="py-2">{t("manager.dues.columns.due")}</th>
                    <th className="py-2 text-right">{t("manager.dues.columns.total")}</th>
                    <th className="py-2 text-right">{t("manager.dues.columns.paid")}</th>
                    <th className="py-2 text-right">{t("manager.dues.columns.outstanding")}</th>
                    <th className="py-2">{t("manager.dues.columns.status")}</th>
                    <th className="py-2 text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {charges.map((c) => {
                    const owe = (Number(c.totalAmount) - Number(c.paidAmount)).toFixed(2);
                    return (
                      <tr key={c.id}>
                        <td className="py-2 font-mono text-xs">{c.unit.code}</td>
                        <td className="py-2">
                          {String(c.periodYear)}-{String(c.periodMonth).padStart(2, "0")}
                        </td>
                        <td className="py-2 text-xs text-[var(--color-foreground-muted)]">
                          {formatDate(c.dueDate)}
                        </td>
                        <td className="py-2 text-right tabular-nums">
                          {formatMoney(c.totalAmount, "RSD")}
                        </td>
                        <td className="py-2 text-right tabular-nums">
                          {formatMoney(c.paidAmount, "RSD")}
                        </td>
                        <td className="py-2 text-right font-semibold tabular-nums">
                          {formatMoney(owe, "RSD")}
                        </td>
                        <td className="py-2 text-xs">
                          {t(`manager.dues.status.${c.status}` as const)}
                        </td>
                        <td className="py-2 text-right">
                          <Link
                            href={`/zgrade/zaduzenja/${c.id}`}
                            className="text-xs text-[var(--color-brand-700)] hover:underline"
                          >
                            Detalj →
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle className="text-sm">{t("manager.finance.expensesTitle")}</CardTitle>
          <PermissionGuard permission="building.manage">
            <NewExpenseDialog
              buildingId={id}
              suppliers={suppliers.map((s) => ({ id: s.id, name: s.name }))}
            />
          </PermissionGuard>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-3">
            {expenseSummary.length === 0 ? (
              <p className="text-sm text-[var(--color-foreground-muted)]">
                {t("manager.finance.expensesEmpty")}
              </p>
            ) : (
              expenseSummary.map((s) => (
                <div
                  key={s.fund}
                  className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-inset)] p-3"
                >
                  <div className="text-xs text-[var(--color-foreground-muted)] uppercase">
                    {FUND_LABEL_SR[s.fund]}
                  </div>
                  <div className="text-lg font-semibold tabular-nums">
                    {formatMoney(s.total, "RSD")}
                  </div>
                  <div className="text-xs text-[var(--color-foreground-muted)]">
                    {s.count} stavki
                  </div>
                </div>
              ))
            )}
          </div>

          {expenses.length > 0 ? (
            <table className="min-w-full divide-y divide-[var(--color-border)] text-sm">
              <thead className="text-left text-xs tracking-wide text-[var(--color-foreground-muted)] uppercase">
                <tr>
                  <th className="py-2">{t("manager.finance.expenseDate")}</th>
                  <th className="py-2">{t("manager.finance.expenseDescription")}</th>
                  <th className="py-2">{t("manager.finance.expenseFund")}</th>
                  <th className="py-2">{t("manager.finance.expenseSupplier")}</th>
                  <th className="py-2 text-right">{t("manager.finance.expenseAmount")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {expenses.map((e) => (
                  <tr key={e.id}>
                    <td className="py-2 text-xs text-[var(--color-foreground-muted)]">
                      {formatDate(e.spentAt)}
                    </td>
                    <td className="py-2">{e.description}</td>
                    <td className="py-2 text-xs">{FUND_LABEL_SR[e.fund]}</td>
                    <td className="py-2 text-xs">{e.supplier?.name ?? "—"}</td>
                    <td className="py-2 text-right tabular-nums">{formatMoney(e.amount, "RSD")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "ok" | "warn";
}) {
  const toneCls =
    tone === "warn"
      ? "text-red-700"
      : tone === "ok"
        ? "text-emerald-700"
        : "text-[var(--color-foreground)]";
  return (
    <Card>
      <CardContent className="py-4">
        <div className="text-xs text-[var(--color-foreground-muted)] uppercase">{label}</div>
        <div className={`text-xl font-semibold tabular-nums ${toneCls}`}>{value}</div>
      </CardContent>
    </Card>
  );
}
