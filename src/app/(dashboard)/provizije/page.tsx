import Link from "next/link";
import { redirect } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { loadUserContext } from "@/server/auth/context";
import { listCommissionRules } from "@/server/services/commissions/rules.service";
import { listInvestorCommissions } from "@/server/services/commissions/lifecycle.service";
import { prisma } from "@/server/db/prisma";
import { formatDate, formatMoney } from "@/lib/formatters";
import type { SupportedCurrency } from "@/lib/constants/app";
import { CommissionRowActions } from "@/features/commissions/commission-row-actions";
import { createT, type TranslateFn, type TranslationKey } from "@/lib/i18n";

export const dynamic = "force-dynamic";

const COMMISSION_STATUS_KEYS: Record<string, TranslationKey> = {
  CALCULATED: "partners.commissionStatus.CALCULATED",
  APPROVED: "partners.commissionStatus.APPROVED",
  INVOICED: "partners.commissionStatus.INVOICED",
  DUE: "partners.commissionStatus.DUE",
  PAID: "partners.commissionStatus.PAID",
  DISPUTED: "partners.commissionStatus.DISPUTED",
  CANCELED: "partners.commissionStatus.CANCELED",
};

function commissionStatusLabel(status: string, t: TranslateFn): string {
  const key = COMMISSION_STATUS_KEYS[status];
  return key ? t(key) : status;
}

export default async function ProvizijePage() {
  const ctx = await loadUserContext();
  if (!ctx) redirect("/sign-in");
  if (!ctx.activeOrganization) redirect("/podesavanja");
  if (ctx.activeOrganization.type !== "INVESTOR") redirect("/dashboard");

  const t = createT(ctx.user.locale);

  const rules = await listCommissionRules({
    investorOrganizationId: ctx.activeOrganization.id,
  });

  const { items: commissions } = await listInvestorCommissions({
    investorOrganizationId: ctx.activeOrganization.id,
    page: 1,
    pageSize: 50,
  });

  const canManage = ctx.permissions.includes("commission.manage");

  const connections = await prisma.agencyConnection.findMany({
    where: { investorOrganizationId: ctx.activeOrganization.id },
    select: {
      id: true,
      agency: { select: { name: true } },
    },
  });
  const connectionNames = new Map(
    connections.map((c) => [c.id, c.agency.name] as const),
  );

  const projects = await prisma.project.findMany({
    where: { organizationId: ctx.activeOrganization.id },
    select: { id: true, name: true },
  });
  const projectNames = new Map(projects.map((p) => [p.id, p.name] as const));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{t("partners.commissionsPage.title")}</h1>
          <p className="text-sm text-[var(--color-foreground-muted)]">
            {t("partners.commissionsPage.subtitle")}
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/agencije">{t("partners.commissionsPage.goToAgencies")}</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">
            {t("partners.commissionsPage.activeTitle", { count: commissions.length })}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {commissions.length === 0 ? (
            <div className="py-12 text-center text-sm text-[var(--color-foreground-muted)]">
              {t("partners.commissionsPage.emptyCalculated")}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-[var(--color-border)] text-sm">
                <thead className="bg-[var(--color-surface-inset)] text-left text-xs uppercase tracking-wide text-[var(--color-foreground-muted)]">
                  <tr>
                    <th className="px-4 py-3">{t("partners.sale")}</th>
                    <th className="px-4 py-3">{t("organization.types.agency")}</th>
                    <th className="px-4 py-3">{t("common.statusLabel")}</th>
                    <th className="px-4 py-3 text-right">{t("common.amount")}</th>
                    <th className="px-4 py-3 text-right">{t("partners.created")}</th>
                    <th className="px-4 py-3 text-right">{t("common.actions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {commissions.map((c) => (
                    <tr key={c.id}>
                      <td className="px-4 py-3">
                        <Link
                          href={`/prodaje/${c.saleId}`}
                          className="text-[var(--color-brand-700)] hover:underline"
                        >
                          {c.sale?.unit?.code ?? "—"}
                        </Link>
                      </td>
                      <td className="px-4 py-3">{c.agency.name}</td>
                      <td className="px-4 py-3">{commissionStatusLabel(c.status, t)}</td>
                      <td className="px-4 py-3 text-right font-medium">
                        {formatMoney(
                          (c.adjustedAmount ?? c.calculatedAmount).toString(),
                          c.currency as SupportedCurrency,
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-[var(--color-foreground-muted)]">
                        {formatDate(c.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {canManage ? (
                          <CommissionRowActions
                            commissionId={c.id}
                            status={c.status}
                          />
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">
            {t("partners.commissionsPage.rulesTotal", { count: rules.length })}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {rules.length === 0 ? (
            <div className="py-12 text-center text-sm text-[var(--color-foreground-muted)]">
              {t("partners.commissionsPage.emptyRules")}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-[var(--color-border)] text-sm">
                <thead className="bg-[var(--color-surface-inset)] text-left text-xs uppercase tracking-wide text-[var(--color-foreground-muted)]">
                  <tr>
                    <th className="px-4 py-3">{t("organization.types.agency")}</th>
                    <th className="px-4 py-3">{t("units.columns.project")}</th>
                    <th className="px-4 py-3">{t("partners.level")}</th>
                    <th className="px-4 py-3">{t("common.type")}</th>
                    <th className="px-4 py-3 text-right">{t("partners.value")}</th>
                    <th className="px-4 py-3 text-right">{t("partners.valid")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {rules.map((r) => (
                    <tr key={r.id}>
                      <td className="px-4 py-3">
                        {r.agencyConnectionId
                          ? connectionNames.get(r.agencyConnectionId) ?? "—"
                          : t("common.all")}
                      </td>
                      <td className="px-4 py-3">
                        {r.projectId ? projectNames.get(r.projectId) ?? "—" : t("partners.allProjectsShort")}
                      </td>
                      <td className="px-4 py-3">
                        {r.unitId
                          ? t("partners.ruleTier.unit")
                          : r.projectId && r.agencyConnectionId
                            ? t("partners.ruleTier.projectAndAgency")
                            : r.agencyConnectionId
                              ? t("partners.ruleTier.connection")
                              : t("partners.ruleTier.projectDefault")}
                      </td>
                      <td className="px-4 py-3">
                        {r.calculationType === "PERCENTAGE"
                          ? t("partners.percentage")
                          : t("partners.fixedAmount")}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {r.calculationType === "PERCENTAGE"
                          ? `${r.rate?.toString() ?? "0"} %`
                          : `${r.fixedAmount?.toString() ?? "0"} ${r.currency}`}
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-[var(--color-foreground-muted)]">
                        {r.validFrom || r.validTo
                          ? `${r.validFrom ? formatDate(r.validFrom) : "—"} → ${r.validTo ? formatDate(r.validTo) : "—"}`
                          : t("partners.unlimited")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
