import Link from "next/link";
import { notFound } from "next/navigation";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PermissionGuard } from "@/components/app/permission-guard";
import { loadUserContext, requireTenantPage } from "@/server/auth/context";
import { getManagedBuilding, listManagedUnits } from "@/server/services/manager/buildings.service";
import { isDomainError } from "@/lib/errors";
import { createT } from "@/lib/i18n";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function BuildingUnitsTab({ params }: Props) {
  const { id } = await params;
  const ctx = await loadUserContext();
  requireTenantPage(ctx, { permission: "building.read", orgType: "MANAGER" });
  const t = createT(ctx.user.locale);

  try {
    await getManagedBuilding(ctx.activeOrganization.id, id);
  } catch (err) {
    if (isDomainError(err) && err.code === "NOT_FOUND") return notFound();
    throw err;
  }
  const units = await listManagedUnits({
    organizationId: ctx.activeOrganization.id,
    buildingId: id,
    includeArchived: false,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end gap-2">
        <PermissionGuard permission="building.import">
          <Button asChild variant="outline">
            <Link href={`/zgrade/${id}/uvoz`}>{t("manager.units.importButton")}</Link>
          </Button>
        </PermissionGuard>
      </div>

      {units.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-[var(--color-foreground-muted)]">
            {t("manager.units.empty")}
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-md border border-[var(--color-border)] bg-[var(--color-surface)]">
          <table className="min-w-full divide-y divide-[var(--color-border)] text-sm">
            <thead className="bg-[var(--color-surface-inset)] text-left text-xs tracking-wide text-[var(--color-foreground-muted)] uppercase">
              <tr>
                <th className="px-4 py-3">{t("manager.units.columns.code")}</th>
                <th className="px-4 py-3">{t("manager.units.columns.type")}</th>
                <th className="px-4 py-3">{t("manager.units.columns.entrance")}</th>
                <th className="px-4 py-3 text-right">{t("manager.units.columns.floor")}</th>
                <th className="px-4 py-3 text-right">{t("manager.units.columns.area")}</th>
                <th className="px-4 py-3 text-right">{t("manager.units.columns.share")}</th>
                <th className="px-4 py-3">{t("manager.units.columns.primaryOwner")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {units.map((u) => {
                const primary = u.ownerships.find((o) => o.isPrimary) ?? u.ownerships[0];
                const owner = primary?.person
                  ? (primary.person.legalName ??
                    [primary.person.firstName, primary.person.lastName].filter(Boolean).join(" "))
                  : "—";
                return (
                  <tr key={u.id} className="hover:bg-[var(--color-surface-inset)]">
                    <td className="px-4 py-3 font-mono text-xs">{u.code}</td>
                    <td className="px-4 py-3">{u.type}</td>
                    <td className="px-4 py-3">{u.entrance?.code ?? "—"}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {u.floor != null ? u.floor : "—"}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {Number(u.totalArea).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {Number(u.participationShare).toFixed(2)}
                    </td>
                    <td className="px-4 py-3">{owner}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
