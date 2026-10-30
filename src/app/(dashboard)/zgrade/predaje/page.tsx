import Link from "next/link";
import type { BuildingHandoverStatus } from "@prisma/client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { loadUserContext, requireTenantPage } from "@/server/auth/context";
import { listTargetHandovers } from "@/server/services/manager/handover.service";
import { formatDate } from "@/lib/formatters";
import { createT } from "@/lib/i18n";

const STATUS_TONE: Record<BuildingHandoverStatus, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  ACCEPTED: "bg-emerald-100 text-emerald-700",
  REJECTED: "bg-rose-100 text-rose-700",
  CANCELED: "bg-neutral-200 text-neutral-700",
};

export default async function ManagerHandoversPage() {
  const ctx = await loadUserContext();
  requireTenantPage(ctx, { permission: "building.handover", orgType: "MANAGER" });
  const t = createT(ctx.user.locale);

  const rows = await listTargetHandovers({
    targetOrganizationId: ctx.activeOrganization.id,
    targetContactEmail: ctx.user.email,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("nav.handovers")}</h1>
        <p className="text-sm text-[var(--color-foreground-muted)]">{t("manager.handover.body")}</p>
      </div>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-[var(--color-foreground-muted)]">
            —
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-md border border-[var(--color-border)] bg-[var(--color-surface)]">
          <table className="min-w-full divide-y divide-[var(--color-border)] text-sm">
            <thead className="bg-[var(--color-surface-inset)] text-left text-xs tracking-wide text-[var(--color-foreground-muted)] uppercase">
              <tr>
                <th className="px-4 py-3">{t("manager.handover.summary.projectName")}</th>
                <th className="px-4 py-3">Investitor</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Pokrenuto</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-[var(--color-surface-inset)]">
                  <td className="px-4 py-3">
                    <div className="font-medium">{r.sourceProject.name}</div>
                    <div className="font-mono text-xs text-[var(--color-foreground-muted)]">
                      {r.sourceProject.code}
                    </div>
                  </td>
                  <td className="px-4 py-3">{r.sourceOrganization.name}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_TONE[r.status]}`}
                    >
                      {t(`manager.handover.status.${r.status}` as const)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-[var(--color-foreground-muted)]">
                    {formatDate(r.initiatedAt)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/zgrade/predaje/${r.id}`}>{t("common.open")}</Link>
                    </Button>
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
