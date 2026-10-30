import Link from "next/link";

import { Card, CardContent } from "@/components/ui/card";
import { loadUserContext, requireTenantPage } from "@/server/auth/context";
import { listDebtors } from "@/server/services/manager/dues.service";
import { formatDate, formatMoney } from "@/lib/formatters";
import { createT } from "@/lib/i18n";

export default async function DebtorsPage() {
  const ctx = await loadUserContext();
  requireTenantPage(ctx, { permission: "dues.read", orgType: "MANAGER" });
  const t = createT(ctx.user.locale);

  const debtors = await listDebtors({ organizationId: ctx.activeOrganization.id });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("manager.debtors.title")}</h1>
        <p className="text-sm text-[var(--color-foreground-muted)]">
          {t("manager.debtors.subtitle")}
        </p>
      </div>

      {debtors.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-[var(--color-foreground-muted)]">
            {t("manager.debtors.empty")}
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-md border border-[var(--color-border)] bg-[var(--color-surface)]">
          <table className="min-w-full divide-y divide-[var(--color-border)] text-sm">
            <thead className="bg-[var(--color-surface-inset)] text-left text-xs tracking-wide text-[var(--color-foreground-muted)] uppercase">
              <tr>
                <th className="px-4 py-3">{t("manager.debtors.columns.building")}</th>
                <th className="px-4 py-3">{t("manager.debtors.columns.unit")}</th>
                <th className="px-4 py-3">{t("manager.debtors.columns.owner")}</th>
                <th className="px-4 py-3 text-right">{t("manager.debtors.columns.outstanding")}</th>
                <th className="px-4 py-3">{t("manager.debtors.columns.oldest")}</th>
                <th className="px-4 py-3">{t("manager.debtors.columns.contact")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {debtors.map((d) => (
                <tr key={d.unitId} className="hover:bg-[var(--color-surface-inset)]">
                  <td className="px-4 py-3">
                    <Link
                      href={`/zgrade/${d.buildingId}`}
                      className="text-[var(--color-brand-700)] hover:underline"
                    >
                      {d.buildingName}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{d.unitCode}</td>
                  <td className="px-4 py-3">{d.primaryOwner ?? "—"}</td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums">
                    {formatMoney(d.outstanding, "RSD")}
                  </td>
                  <td className="px-4 py-3 text-[var(--color-foreground-muted)]">
                    {d.oldestDueDate ? formatDate(d.oldestDueDate) : "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-[var(--color-foreground-muted)]">
                    {[d.contactEmail, d.contactPhone].filter(Boolean).join(" · ") || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
