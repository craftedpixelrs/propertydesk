import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PermissionGuard } from "@/components/app/permission-guard";
import { NewBuildingDrawer } from "@/features/manager/new-building-drawer";
import { loadUserContext, requireTenantPage } from "@/server/auth/context";
import { listManagedBuildings } from "@/server/services/manager/buildings.service";
import { formatDate, formatMoney } from "@/lib/formatters";
import { createT } from "@/lib/i18n";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function readParam(raw: string | string[] | undefined): string | undefined {
  if (Array.isArray(raw)) return raw[0];
  return raw;
}

export default async function ZgradePage({ searchParams }: PageProps) {
  const ctx = await loadUserContext();
  requireTenantPage(ctx, { permission: "building.read", orgType: "MANAGER" });

  const t = createT(ctx.user.locale);
  const sp = await searchParams;
  const search = readParam(sp.q);
  const includeArchived = readParam(sp.archived) === "true";
  const page = Number(readParam(sp.page) ?? "1") || 1;
  const pageSize = 20;

  const { items, total } = await listManagedBuildings({
    organizationId: ctx.activeOrganization.id,
    page,
    pageSize,
    search,
    includeArchived,
  });

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{t("manager.buildings.title")}</h1>
          <p className="text-sm text-[var(--color-foreground-muted)]">
            {t("manager.buildings.subtitle")}
          </p>
        </div>
        <PermissionGuard permission="building.manage">
          <NewBuildingDrawer>
            <Button type="button">{t("manager.buildings.newButton")}</Button>
          </NewBuildingDrawer>
        </PermissionGuard>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{t("common.filter")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="flex flex-wrap items-center gap-3" method="get">
            <input
              type="search"
              name="q"
              defaultValue={search ?? ""}
              placeholder={t("manager.buildings.searchPlaceholder")}
              className="h-9 min-w-[14rem] flex-1 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm"
            />
            <label className="flex items-center gap-2 text-sm text-[var(--color-foreground-muted)]">
              <input
                type="checkbox"
                name="archived"
                value="true"
                defaultChecked={includeArchived}
                className="size-4 rounded border-[var(--color-border)]"
              />
              {t("manager.buildings.archivedToggle")}
            </label>
            <Button type="submit" variant="outline" size="sm">
              {t("common.filter")}
            </Button>
          </form>
        </CardContent>
      </Card>

      {items.length === 0 ? (
        <Card>
          <CardContent className="space-y-3 py-12 text-center text-sm text-[var(--color-foreground-muted)]">
            <p>{t("manager.buildings.empty")}</p>
            <PermissionGuard permission="building.manage">
              <div className="flex justify-center pt-2">
                <NewBuildingDrawer>
                  <Button type="button">{t("manager.buildings.newButton")}</Button>
                </NewBuildingDrawer>
              </div>
            </PermissionGuard>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] md:block">
            <table className="min-w-full divide-y divide-[var(--color-border)] text-sm">
              <thead className="bg-[var(--color-surface-inset)] text-left text-xs tracking-wide text-[var(--color-foreground-muted)] uppercase">
                <tr>
                  <th className="px-4 py-3">{t("manager.buildings.columns.name")}</th>
                  <th className="px-4 py-3">{t("manager.buildings.columns.city")}</th>
                  <th className="px-4 py-3">{t("manager.buildings.columns.address")}</th>
                  <th className="px-4 py-3 text-right">
                    {t("manager.buildings.columns.entrances")}
                  </th>
                  <th className="px-4 py-3 text-right">{t("manager.buildings.columns.units")}</th>
                  <th className="px-4 py-3 text-right">{t("manager.buildings.columns.debt")}</th>
                  <th className="px-4 py-3 text-right">{t("inventory.columns.created")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {items.map((b) => (
                  <tr key={b.id} className="hover:bg-[var(--color-surface-inset)]">
                    <td className="px-4 py-3">
                      <Link
                        href={`/zgrade/${b.id}`}
                        className="font-medium text-[var(--color-brand-700)] hover:underline"
                      >
                        {b.name}
                      </Link>
                      {b.archivedAt ? (
                        <span className="ml-2 inline-flex rounded-full bg-neutral-200 px-2 py-0.5 text-xs text-neutral-700">
                          {t("manager.buildings.status.archived")}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">{b.city}</td>
                    <td className="px-4 py-3 text-[var(--color-foreground-muted)]">{b.address}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{b.entranceCount}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{b.unitCount}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {b.outstandingDebt
                        ? formatMoney(b.outstandingDebt, "RSD")
                        : t("manager.buildings.debt.none")}
                    </td>
                    <td className="px-4 py-3 text-right text-[var(--color-foreground-muted)]">
                      {formatDate(b.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid gap-3 md:hidden">
            {items.map((b) => (
              <Card key={b.id}>
                <CardContent className="space-y-2 py-3">
                  <div className="flex items-center justify-between">
                    <Link
                      href={`/zgrade/${b.id}`}
                      className="font-semibold text-[var(--color-brand-700)]"
                    >
                      {b.name}
                    </Link>
                    {b.archivedAt ? (
                      <span className="inline-flex rounded-full bg-neutral-200 px-2 py-0.5 text-xs text-neutral-700">
                        {t("manager.buildings.status.archived")}
                      </span>
                    ) : null}
                  </div>
                  <div className="text-xs text-[var(--color-foreground-muted)]">
                    {b.city} · {b.address}
                  </div>
                  <div className="text-xs text-[var(--color-foreground-muted)]">
                    {t("manager.buildings.columns.units")}: {b.unitCount} ·{" "}
                    {t("manager.buildings.columns.debt")}:{" "}
                    {b.outstandingDebt
                      ? formatMoney(b.outstandingDebt, "RSD")
                      : t("manager.buildings.debt.none")}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {totalPages > 1 ? (
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--color-foreground-muted)]">
                {t("inventory.pagination.pageOf", { page, total: totalPages })}
              </span>
              <div className="flex gap-2">
                {page > 1 ? (
                  <Button asChild variant="outline" size="sm">
                    <Link
                      href={{
                        pathname: "/zgrade",
                        query: {
                          ...(search ? { q: search } : {}),
                          ...(includeArchived ? { archived: "true" } : {}),
                          page: String(page - 1),
                        },
                      }}
                    >
                      {t("inventory.pagination.prev")}
                    </Link>
                  </Button>
                ) : null}
                {page < totalPages ? (
                  <Button asChild variant="outline" size="sm">
                    <Link
                      href={{
                        pathname: "/zgrade",
                        query: {
                          ...(search ? { q: search } : {}),
                          ...(includeArchived ? { archived: "true" } : {}),
                          page: String(page + 1),
                        },
                      }}
                    >
                      {t("inventory.pagination.next")}
                    </Link>
                  </Button>
                ) : null}
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
