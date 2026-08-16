import { redirect } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { loadUserContext } from "@/server/auth/context";
import { listAgencyCommissions } from "@/server/services/commissions/commissions.service";
import { formatDate } from "@/lib/formatters";
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

export default async function MojeProvizijePage() {
  const ctx = await loadUserContext();
  if (!ctx) redirect("/sign-in");
  if (!ctx.activeOrganization) redirect("/podesavanja");
  if (ctx.activeOrganization.type !== "AGENCY") redirect("/dashboard");

  const t = createT(ctx.user.locale);

  const { items, total } = await listAgencyCommissions({
    agencyOrganizationId: ctx.activeOrganization.id,
    page: 1,
    pageSize: 50,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("nav.myCommissions")}</h1>
        <p className="text-sm text-[var(--color-foreground-muted)]">
          {t("partners.myCommissions.subtitle")}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{t("partners.totalCount", { count: total })}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {items.length === 0 ? (
            <div className="py-12 text-center text-sm text-[var(--color-foreground-muted)]">
              {t("partners.myCommissions.empty")}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-[var(--color-border)] text-sm">
                <thead className="bg-[var(--color-surface-inset)] text-left text-xs uppercase tracking-wide text-[var(--color-foreground-muted)]">
                  <tr>
                    <th className="px-4 py-3">{t("partners.sale")}</th>
                    <th className="px-4 py-3">{t("common.statusLabel")}</th>
                    <th className="px-4 py-3">{t("common.type")}</th>
                    <th className="px-4 py-3 text-right">{t("partners.baseAmount")}</th>
                    <th className="px-4 py-3 text-right">{t("common.amount")}</th>
                    <th className="px-4 py-3">{t("partners.created")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {items.map((c) => (
                    <tr key={c.id}>
                      <td className="px-4 py-3 font-mono text-xs">{c.saleId}</td>
                      <td className="px-4 py-3 text-xs">
                        {commissionStatusLabel(c.status, t)}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {c.calculationType === "PERCENTAGE"
                          ? t("partners.percentageRate", { rate: c.rate ?? "—" })
                          : t("partners.fixedAmount")}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {c.baseAmount} {c.currency}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-medium">
                        {c.amount} {c.currency}
                      </td>
                      <td className="px-4 py-3 text-[var(--color-foreground-muted)]">
                        {formatDate(c.createdAt)}
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
