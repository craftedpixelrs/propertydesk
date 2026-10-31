import Link from "next/link";
import { notFound } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PermissionGuard } from "@/components/app/permission-guard";
import { loadUserContext, requireTenantPage } from "@/server/auth/context";
import { getBuildingNotice } from "@/server/services/manager/notices.service";
import { isDomainError } from "@/lib/errors";
import { formatDateTime } from "@/lib/formatters";
import { createT } from "@/lib/i18n";
import { PublishNoticeButton } from "@/features/manager/notice-forms";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function NoticeDetailPage({ params }: Props) {
  const { id } = await params;
  const ctx = await loadUserContext();
  requireTenantPage(ctx, { permission: "notice.read", orgType: "MANAGER" });
  const t = createT(ctx.user.locale);

  let notice: Awaited<ReturnType<typeof getBuildingNotice>>;
  try {
    notice = await getBuildingNotice(ctx.activeOrganization.id, id);
  } catch (err) {
    if (isDomainError(err) && err.code === "NOT_FOUND") return notFound();
    throw err;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs text-[var(--color-foreground-muted)] uppercase">
            {notice.building.name}
          </div>
          <h1 className="text-2xl font-semibold">{notice.title}</h1>
          <p className="text-sm text-[var(--color-foreground-muted)]">
            {t(`manager.notices.channels.${notice.channel}`)} ·{" "}
            {t(`manager.notices.audiences.${notice.audience}`)} ·{" "}
            {notice.publishedAt
              ? formatDateTime(notice.publishedAt)
              : t("manager.notices.draftBadge")}
          </p>
        </div>
        {!notice.publishedAt ? (
          <PermissionGuard permission="notice.manage">
            <PublishNoticeButton noticeId={notice.id} />
          </PermissionGuard>
        ) : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{t("manager.notices.bodyField")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="whitespace-pre-wrap">{notice.body}</p>
          <p className="text-xs text-[var(--color-foreground-muted)]">
            {t("manager.notices.columns.delivered")}: {notice.emailDeliveredCount}
          </p>
        </CardContent>
      </Card>

      {notice.assembly || notice.ticket ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t("manager.notices.relatedTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {notice.assembly ? (
              <Link
                href={`/zgrade/skupstine/${notice.assembly.id}`}
                className="block text-[var(--color-brand-700)] hover:underline"
              >
                {notice.assembly.code} · {notice.assembly.title}
              </Link>
            ) : null}
            {notice.ticket ? (
              <Link
                href={`/zgrade/kvarovi/${notice.ticket.id}`}
                className="block text-[var(--color-brand-700)] hover:underline"
              >
                {notice.ticket.code} · {notice.ticket.title}
              </Link>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <Link
        href={`/zgrade/${notice.buildingId}/obavestenja`}
        className="inline-block text-sm text-[var(--color-brand-700)] hover:underline"
      >
        {t("manager.notices.backToBuilding")}
      </Link>
    </div>
  );
}
