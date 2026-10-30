import Link from "next/link";

import { Card, CardContent } from "@/components/ui/card";
import { PermissionGuard } from "@/components/app/permission-guard";
import { loadUserContext, requireTenantPage } from "@/server/auth/context";
import { prisma } from "@/server/db/prisma";
import { listBuildingNotices } from "@/server/services/manager/notices.service";
import { formatDate } from "@/lib/formatters";
import { createT } from "@/lib/i18n";
import { NewNoticeDialog, PublishNoticeButton } from "@/features/manager/notice-forms";

export default async function NoticesListPage() {
  const ctx = await loadUserContext();
  requireTenantPage(ctx, { permission: "notice.read", orgType: "MANAGER" });
  const t = createT(ctx.user.locale);

  const [rows, buildings, entrances, units] = await Promise.all([
    listBuildingNotices({ organizationId: ctx.activeOrganization.id }),
    prisma.managedBuilding.findMany({
      where: { organizationId: ctx.activeOrganization.id, archivedAt: null },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.buildingEntranceSection.findMany({
      where: {
        building: { organizationId: ctx.activeOrganization.id, archivedAt: null },
      },
      select: { id: true, code: true, label: true, buildingId: true },
      orderBy: [{ buildingId: "asc" }, { sortOrder: "asc" }, { code: "asc" }],
    }),
    prisma.managedUnit.findMany({
      where: {
        organizationId: ctx.activeOrganization.id,
        archivedAt: null,
      },
      select: {
        id: true,
        code: true,
        buildingId: true,
        entranceId: true,
        type: true,
      },
      orderBy: { code: "asc" },
      take: 5000,
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{t("manager.notices.title")}</h1>
          <p className="text-sm text-[var(--color-foreground-muted)]">
            {t("manager.notices.subtitle")}
          </p>
        </div>
        <PermissionGuard permission="notice.manage">
          <NewNoticeDialog buildings={buildings} entrances={entrances} units={units} />
        </PermissionGuard>
      </div>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-[var(--color-foreground-muted)]">
            {t("manager.notices.empty")}
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-md border border-[var(--color-border)] bg-[var(--color-surface)]">
          <table className="min-w-full divide-y divide-[var(--color-border)] text-sm">
            <thead className="bg-[var(--color-surface-inset)] text-left text-xs tracking-wide text-[var(--color-foreground-muted)] uppercase">
              <tr>
                <th className="px-4 py-3">{t("manager.notices.columns.title")}</th>
                <th className="px-4 py-3">{t("manager.notices.columns.building")}</th>
                <th className="px-4 py-3">{t("manager.notices.columns.channel")}</th>
                <th className="px-4 py-3">{t("manager.notices.columns.audience")}</th>
                <th className="px-4 py-3">{t("manager.notices.columns.publishedAt")}</th>
                <th className="px-4 py-3 text-right">{t("manager.notices.columns.delivered")}</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {rows.map((n) => (
                <tr key={n.id} className="hover:bg-[var(--color-surface-inset)]">
                  <td className="px-4 py-3 font-medium">
                    {n.title}
                    {!n.publishedAt ? (
                      <span className="ml-2 inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">
                        {t("manager.notices.draftBadge")}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/zgrade/${n.building.id}`}
                      className="text-[var(--color-brand-700)] hover:underline"
                    >
                      {n.building.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {t(`manager.notices.channels.${n.channel}` as const)}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {t(`manager.notices.audiences.${n.audience}` as const)}
                  </td>
                  <td className="px-4 py-3 text-xs text-[var(--color-foreground-muted)]">
                    {n.publishedAt ? formatDate(n.publishedAt) : "—"}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{n.emailDeliveredCount}</td>
                  <td className="px-4 py-3 text-right">
                    {!n.publishedAt ? (
                      <PermissionGuard permission="notice.manage">
                        <PublishNoticeButton noticeId={n.id} />
                      </PermissionGuard>
                    ) : null}
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
