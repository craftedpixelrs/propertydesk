import Link from "next/link";

import { Card, CardContent } from "@/components/ui/card";
import { PermissionGuard } from "@/components/app/permission-guard";
import { loadUserContext, requireTenantPage } from "@/server/auth/context";
import { listAssemblies } from "@/server/services/manager/assemblies.service";
import { assertBuildingBelongsToOrg } from "@/server/services/manager/buildings.service";
import { prisma } from "@/server/db/prisma";
import { formatDateTime } from "@/lib/formatters";
import { createT } from "@/lib/i18n";
import { NewAssemblyDialog } from "@/features/manager/assembly-forms";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function BuildingAssembliesTab({ params }: Props) {
  const { id } = await params;
  const ctx = await loadUserContext();
  requireTenantPage(ctx, { permission: "building.read", orgType: "MANAGER" });
  const t = createT(ctx.user.locale);

  await assertBuildingBelongsToOrg(ctx.activeOrganization.id, id);
  const [rows, building] = await Promise.all([
    listAssemblies({ organizationId: ctx.activeOrganization.id, buildingId: id }),
    prisma.managedBuilding.findUnique({ where: { id }, select: { id: true, name: true } }),
  ]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end gap-2">
        <PermissionGuard permission="assembly.manage">
          <NewAssemblyDialog buildings={building ? [building] : []} defaultBuildingId={id} />
        </PermissionGuard>
      </div>
      {rows.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-[var(--color-foreground-muted)]">
            {t("manager.assemblies.empty")}
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-md border border-[var(--color-border)] bg-[var(--color-surface)]">
          <table className="min-w-full divide-y divide-[var(--color-border)] text-sm">
            <thead className="bg-[var(--color-surface-inset)] text-left text-xs tracking-wide text-[var(--color-foreground-muted)] uppercase">
              <tr>
                <th className="px-4 py-3">{t("manager.assemblies.columns.code")}</th>
                <th className="px-4 py-3">{t("manager.assemblies.columns.title")}</th>
                <th className="px-4 py-3">{t("manager.assemblies.columns.type")}</th>
                <th className="px-4 py-3">{t("manager.assemblies.columns.status")}</th>
                <th className="px-4 py-3">{t("manager.assemblies.columns.scheduledAt")}</th>
                <th className="px-4 py-3 text-right">{t("manager.assemblies.columns.items")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {rows.map((a) => (
                <tr key={a.id} className="hover:bg-[var(--color-surface-inset)]">
                  <td className="px-4 py-3 font-mono text-xs">
                    <Link
                      href={`/zgrade/skupstine/${a.id}`}
                      className="text-[var(--color-brand-700)] hover:underline"
                    >
                      {a.code}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-medium">
                    <Link href={`/zgrade/skupstine/${a.id}`} className="hover:underline">
                      {a.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {t(`manager.assemblies.type.${a.type}` as const)}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {t(`manager.assemblies.status.${a.status}` as const)}
                  </td>
                  <td className="px-4 py-3 text-xs text-[var(--color-foreground-muted)]">
                    {formatDateTime(a.scheduledAt)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{a._count.items}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
