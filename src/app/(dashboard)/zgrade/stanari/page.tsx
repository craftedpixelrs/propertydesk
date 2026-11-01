import Link from "next/link";

import { Card, CardContent } from "@/components/ui/card";
import { PermissionGuard } from "@/components/app/permission-guard";
import { loadUserContext, requireTenantPage } from "@/server/auth/context";
import { prisma } from "@/server/db/prisma";
import { listResidentAccesses } from "@/server/services/manager/residents.service";
import { formatDate } from "@/lib/formatters";
import { createT } from "@/lib/i18n";
import type { ResidentAccessStatus } from "@prisma/client";
import {
  AddResidentDialog,
  ResendInviteButton,
  RevokeAccessButton,
} from "@/features/manager/resident-actions";

const STATUS_TONE: Record<ResidentAccessStatus, string> = {
  PENDING_INVITE: "bg-amber-100 text-amber-700",
  ACTIVE: "bg-emerald-100 text-emerald-700",
  REVOKED: "bg-neutral-200 text-neutral-700",
};

export default async function ResidentAccessPage({
  searchParams,
}: {
  searchParams: Promise<{ building?: string }>;
}) {
  const { building } = await searchParams;
  const ctx = await loadUserContext();
  requireTenantPage(ctx, { permission: "resident.read", orgType: "MANAGER" });
  const t = createT(ctx.user.locale);

  const [rows, buildings, units] = await Promise.all([
    listResidentAccesses({
      organizationId: ctx.activeOrganization.id,
      buildingId: building || undefined,
    }),
    prisma.managedBuilding.findMany({
      where: { organizationId: ctx.activeOrganization.id, archivedAt: null },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.managedUnit.findMany({
      where: { organizationId: ctx.activeOrganization.id, archivedAt: null },
      select: { id: true, code: true, buildingId: true },
      orderBy: { code: "asc" },
      take: 2000,
    }),
  ]);
  const canInvite = ctx.isSuperAdmin || ctx.permissions.includes("resident.manage");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{t("manager.residents.title")}</h1>
          <p className="text-sm text-[var(--color-foreground-muted)]">
            {t("manager.residents.subtitle")}
          </p>
        </div>
        {buildings.length > 0 ? (
          <PermissionGuard permission="building.manage">
            <AddResidentDialog buildings={buildings} units={units} canInvite={canInvite} />
          </PermissionGuard>
        ) : null}
      </div>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="space-y-2 py-10 text-center text-sm text-[var(--color-foreground-muted)]">
            <p>
              {buildings.length === 0
                ? t("manager.residents.noBuildings")
                : t("manager.residents.empty")}
            </p>
            {buildings.length === 0 ? (
              <Link href="/zgrade" className="text-[var(--color-brand-700)] hover:underline">
                {t("manager.buildings.title")}
              </Link>
            ) : null}
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-md border border-[var(--color-border)] bg-[var(--color-surface)]">
          <table className="min-w-full divide-y divide-[var(--color-border)] text-sm">
            <thead className="bg-[var(--color-surface-inset)] text-left text-xs tracking-wide text-[var(--color-foreground-muted)] uppercase">
              <tr>
                <th className="px-4 py-3">{t("manager.residents.columns.email")}</th>
                <th className="px-4 py-3">{t("manager.residents.columns.person")}</th>
                <th className="px-4 py-3">{t("manager.residents.columns.unit")}</th>
                <th className="px-4 py-3">{t("manager.residents.columns.building")}</th>
                <th className="px-4 py-3">{t("manager.residents.columns.status")}</th>
                <th className="px-4 py-3">{t("manager.residents.columns.invitedAt")}</th>
                <th className="px-4 py-3">{t("manager.residents.columns.acceptedAt")}</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {rows.map((r) => {
                const personName =
                  r.person.legalName ??
                  ([r.person.firstName, r.person.lastName].filter(Boolean).join(" ") || "—");
                return (
                  <tr key={r.id} className="hover:bg-[var(--color-surface-inset)]">
                    <td className="px-4 py-3 font-mono text-xs">{r.email}</td>
                    <td className="px-4 py-3">{personName}</td>
                    <td className="px-4 py-3 font-mono text-xs">
                      <Link
                        href={`/zgrade/${r.unit.building.id}/delovi/${r.unit.id}`}
                        className="text-[var(--color-brand-700)] hover:underline"
                      >
                        {r.unit.code}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/zgrade/${r.unit.building.id}`}
                        className="text-[var(--color-brand-700)] hover:underline"
                      >
                        {r.unit.building.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_TONE[r.status]}`}
                      >
                        {t(`manager.residents.status.${r.status}` as const)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--color-foreground-muted)]">
                      {formatDate(r.invitedAt)}
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--color-foreground-muted)]">
                      {r.acceptedAt ? formatDate(r.acceptedAt) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {r.status !== "REVOKED" ? (
                        <PermissionGuard permission="resident.manage">
                          <div className="inline-flex gap-1">
                            <ResendInviteButton accessId={r.id} />
                            <RevokeAccessButton accessId={r.id} />
                          </div>
                        </PermissionGuard>
                      ) : null}
                    </td>
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
