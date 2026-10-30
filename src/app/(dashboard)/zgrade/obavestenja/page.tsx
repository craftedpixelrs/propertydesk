import Link from "next/link";

import { Card, CardContent } from "@/components/ui/card";
import { loadUserContext, requireTenantPage } from "@/server/auth/context";
import { listBuildingNotices } from "@/server/services/manager/notices.service";
import { formatDate } from "@/lib/formatters";
import { createT } from "@/lib/i18n";

export default async function NoticesListPage() {
  const ctx = await loadUserContext();
  requireTenantPage(ctx, { permission: "notice.read", orgType: "MANAGER" });
  const t = createT(ctx.user.locale);

  const rows = await listBuildingNotices({
    organizationId: ctx.activeOrganization.id,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("manager.notices.title")}</h1>
        <p className="text-sm text-[var(--color-foreground-muted)]">
          {t("manager.notices.subtitle")}
        </p>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
