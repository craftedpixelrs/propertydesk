import { Card, CardContent } from "@/components/ui/card";
import { PermissionGuard } from "@/components/app/permission-guard";
import { loadUserContext, requireTenantPage } from "@/server/auth/context";
import { listBuildingNotices } from "@/server/services/manager/notices.service";
import {
  assertBuildingBelongsToOrg,
  getManagedBuilding,
} from "@/server/services/manager/buildings.service";
import { prisma } from "@/server/db/prisma";
import { formatDate } from "@/lib/formatters";
import { createT } from "@/lib/i18n";
import { NewNoticeDialog, PublishNoticeButton } from "@/features/manager/notice-forms";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function BuildingNoticesTab({ params }: Props) {
  const { id } = await params;
  const ctx = await loadUserContext();
  requireTenantPage(ctx, { permission: "building.read", orgType: "MANAGER" });
  const t = createT(ctx.user.locale);
  await assertBuildingBelongsToOrg(ctx.activeOrganization.id, id);

  const [rows, building, entrances, units] = await Promise.all([
    listBuildingNotices({ organizationId: ctx.activeOrganization.id, buildingId: id }),
    getManagedBuilding(ctx.activeOrganization.id, id),
    prisma.buildingEntranceSection.findMany({
      where: { buildingId: id },
      select: { id: true, code: true, label: true, buildingId: true },
      orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
    }),
    prisma.managedUnit.findMany({
      where: { buildingId: id, archivedAt: null },
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
    <div className="space-y-4">
      <div className="flex items-center justify-end gap-2">
        <PermissionGuard permission="notice.manage">
          <NewNoticeDialog
            buildings={[{ id: building.id, name: building.name }]}
            entrances={entrances}
            units={units}
            defaultBuildingId={id}
          />
        </PermissionGuard>
      </div>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-[var(--color-foreground-muted)]">
            {t("manager.notices.empty")}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {rows.map((n) => (
            <Card key={n.id}>
              <CardContent className="space-y-2 py-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold">
                      {n.title}
                      {!n.publishedAt ? (
                        <span className="ml-2 inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">
                          {t("manager.notices.draftBadge")}
                        </span>
                      ) : null}
                    </h3>
                    <div className="text-xs text-[var(--color-foreground-muted)]">
                      {t(`manager.notices.channels.${n.channel}` as const)} ·{" "}
                      {t(`manager.notices.audiences.${n.audience}` as const)} ·{" "}
                      {n.publishedAt ? formatDate(n.publishedAt) : "—"} · {n.emailDeliveredCount}{" "}
                      emailova
                    </div>
                  </div>
                  {!n.publishedAt ? (
                    <PermissionGuard permission="notice.manage">
                      <PublishNoticeButton noticeId={n.id} />
                    </PermissionGuard>
                  ) : null}
                </div>
                <p className="text-sm whitespace-pre-wrap">{n.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
