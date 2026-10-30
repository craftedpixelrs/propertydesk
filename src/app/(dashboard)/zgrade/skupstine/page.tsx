import Link from "next/link";

import { Card, CardContent } from "@/components/ui/card";
import { PermissionGuard } from "@/components/app/permission-guard";
import { loadUserContext, requireTenantPage } from "@/server/auth/context";
import { prisma } from "@/server/db/prisma";
import { listAssemblies } from "@/server/services/manager/assemblies.service";
import { formatDateTime } from "@/lib/formatters";
import { createT } from "@/lib/i18n";
import type { AssemblyStatus } from "@prisma/client";
import { NewAssemblyDialog } from "@/features/manager/assembly-forms";

const STATUS_TONE: Record<AssemblyStatus, string> = {
  SCHEDULED: "bg-sky-100 text-sky-700",
  OPEN_FOR_VOTING: "bg-amber-100 text-amber-700",
  COMPLETED: "bg-emerald-100 text-emerald-700",
  CANCELED: "bg-neutral-200 text-neutral-700",
};

export default async function AssembliesListPage() {
  const ctx = await loadUserContext();
  requireTenantPage(ctx, { permission: "assembly.read", orgType: "MANAGER" });
  const t = createT(ctx.user.locale);

  const [rows, buildings] = await Promise.all([
    listAssemblies({ organizationId: ctx.activeOrganization.id }),
    prisma.managedBuilding.findMany({
      where: { organizationId: ctx.activeOrganization.id, archivedAt: null },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{t("manager.assemblies.title")}</h1>
          <p className="text-sm text-[var(--color-foreground-muted)]">
            {t("manager.assemblies.subtitle")}
          </p>
        </div>
        <PermissionGuard permission="assembly.manage">
          <NewAssemblyDialog buildings={buildings} />
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
                <th className="px-4 py-3">{t("manager.assemblies.columns.building")}</th>
                <th className="px-4 py-3">{t("manager.assemblies.columns.type")}</th>
                <th className="px-4 py-3">{t("manager.assemblies.columns.status")}</th>
                <th className="px-4 py-3">{t("manager.assemblies.columns.scheduledAt")}</th>
                <th className="px-4 py-3 text-right">{t("manager.assemblies.columns.items")}</th>
                <th className="px-4 py-3 text-right">PDF</th>
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
                  <td className="px-4 py-3">
                    <Link
                      href={`/zgrade/${a.building.id}`}
                      className="text-[var(--color-brand-700)] hover:underline"
                    >
                      {a.building.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {t(`manager.assemblies.type.${a.type}` as const)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_TONE[a.status]}`}
                    >
                      {t(`manager.assemblies.status.${a.status}` as const)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-[var(--color-foreground-muted)]">
                    {formatDateTime(a.scheduledAt)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{a._count.items}</td>
                  <td className="px-4 py-3 text-right">
                    {a.status === "COMPLETED" ? (
                      <a
                        href={`/api/v1/manager/assemblies/${a.id}/minutes`}
                        className="text-xs text-[var(--color-brand-700)] hover:underline"
                      >
                        {t("manager.assemblies.minutesButton")}
                      </a>
                    ) : (
                      "—"
                    )}
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
