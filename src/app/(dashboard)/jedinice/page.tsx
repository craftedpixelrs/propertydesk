import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PermissionGuard } from "@/components/app/permission-guard";
import { UnitsFilterBar } from "@/features/units/units-filter-bar";
import { loadUserContext, requireTenantPage } from "@/server/auth/context";
import { listUnits } from "@/server/services/units.service";
import { listProjects } from "@/server/services/projects.service";
import { formatMoney } from "@/lib/formatters";
import { createT, unitStatusLabel, unitTypeLabel } from "@/lib/i18n";
import type { UnitStatus, UnitType } from "@prisma/client";

const UNIT_STATUS_TONE: Record<UnitStatus, string> = {
  AVAILABLE: "bg-emerald-100 text-emerald-700",
  ON_HOLD: "bg-amber-100 text-amber-700",
  RESERVED: "bg-sky-100 text-sky-700",
  DEPOSIT_PAID: "bg-indigo-100 text-indigo-700",
  CONTRACTED: "bg-purple-100 text-purple-700",
  SOLD: "bg-slate-200 text-slate-800",
  BLOCKED: "bg-red-100 text-red-700",
  NOT_FOR_SALE: "bg-neutral-200 text-neutral-700",
};

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function first(raw: string | string[] | undefined) {
  return Array.isArray(raw) ? raw[0] : raw;
}

function csvArray(raw: string | undefined): string[] | undefined {
  if (!raw) return undefined;
  return raw.split(",").filter(Boolean);
}

export default async function UnitsPage({ searchParams }: PageProps) {
  const ctx = await loadUserContext();
  requireTenantPage(ctx, { permission: "inventory.read", orgType: "INVESTOR" });

  const t = createT(ctx.user.locale);
  const sp = await searchParams;
  const search = first(sp.q);
  const projectId = first(sp.projectId);
  const status = csvArray(first(sp.status)) as UnitStatus[] | undefined;
  const type = csvArray(first(sp.type)) as UnitType[] | undefined;
  const page = Number(first(sp.page) ?? "1") || 1;
  const pageSize = 20;

  const [{ items, total }, projectsList] = await Promise.all([
    listUnits({
      organizationId: ctx.activeOrganization.id,
      page,
      pageSize,
      search,
      projectId,
      status,
      type,
      activeOnly: true,
    }),
    listProjects({
      organizationId: ctx.activeOrganization.id,
      page: 1,
      pageSize: 100,
      activeOnly: true,
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const listQuery = {
    ...(search ? { q: search } : {}),
    ...(projectId ? { projectId } : {}),
    ...(first(sp.status) ? { status: first(sp.status)! } : {}),
    ...(first(sp.type) ? { type: first(sp.type)! } : {}),
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{t("units.title")}</h1>
          <p className="text-sm text-[var(--color-foreground-muted)]">
            {t("inventory.units.subtitle")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <PermissionGuard permission="inventory.export">
            <Button asChild variant="outline">
              <a href={`/api/v1/units/export?format=xlsx${projectId ? `&projectId=${projectId}` : ""}`}>
                {t("inventory.units.exportXlsx")}
              </a>
            </Button>
          </PermissionGuard>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{t("common.filter")}</CardTitle>
        </CardHeader>
        <CardContent>
          <UnitsFilterBar
            values={{
              q: search ?? "",
              projectId: projectId ?? "",
              status: first(sp.status) ?? "",
              type: first(sp.type) ?? "",
            }}
            projects={projectsList.items.map((p) => ({ id: p.id, name: p.name }))}
          />
        </CardContent>
      </Card>

      {items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-[var(--color-foreground-muted)]">
            {t("inventory.units.noFilterResults")}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] md:block">
            <table className="min-w-full divide-y divide-[var(--color-border)] text-sm">
              <thead className="bg-[var(--color-surface-inset)] text-left text-xs uppercase tracking-wide text-[var(--color-foreground-muted)]">
                <tr>
                  <th className="px-4 py-3">{t("inventory.columns.code")}</th>
                  <th className="px-4 py-3">{t("units.columns.project")}</th>
                  <th className="px-4 py-3">{t("units.columns.type")}</th>
                  <th className="px-4 py-3">{t("units.columns.area")}</th>
                  <th className="px-4 py-3">{t("units.detail.pricing")}</th>
                  <th className="px-4 py-3">{t("common.statusLabel")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {items.map((u) => (
                  <tr key={u.id} className="hover:bg-[var(--color-surface-inset)]">
                    <td className="px-4 py-3 font-mono text-xs">
                      <Link
                        href={`/jedinice/${u.id}`}
                        className="text-[var(--color-brand-700)] hover:underline"
                      >
                        {u.code}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/projekti/${u.project.id}`}
                        className="hover:underline"
                      >
                        {u.project.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{unitTypeLabel(u.type, t)}</td>
                    <td className="px-4 py-3 tabular-nums">
                      {u.totalArea.toString()} m²
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      {formatMoney(
                        u.finalPrice ?? u.basePrice,
                        u.currency as "EUR" | "RSD",
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${UNIT_STATUS_TONE[u.status]}`}
                      >
                        {unitStatusLabel(u.status, t)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid gap-3 md:hidden">
            {items.map((u) => (
              <Card key={u.id}>
                <CardContent className="space-y-2 py-3">
                  <div className="flex items-center justify-between">
                    <Link
                      href={`/jedinice/${u.id}`}
                      className="font-semibold text-[var(--color-brand-700)]"
                    >
                      {u.code}
                    </Link>
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${UNIT_STATUS_TONE[u.status]}`}
                    >
                      {unitStatusLabel(u.status, t)}
                    </span>
                  </div>
                  <div className="text-xs text-[var(--color-foreground-muted)]">
                    {u.project.name} · {unitTypeLabel(u.type, t)}
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>{u.totalArea.toString()} m²</span>
                    <span className="font-medium">
                      {formatMoney(
                        u.finalPrice ?? u.basePrice,
                        u.currency as "EUR" | "RSD",
                      )}
                    </span>
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
                        pathname: "/jedinice",
                        query: { ...listQuery, page: String(page - 1) },
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
                        pathname: "/jedinice",
                        query: { ...listQuery, page: String(page + 1) },
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
