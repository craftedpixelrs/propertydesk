import Link from "next/link";
import Decimal from "decimal.js";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PermissionGuard } from "@/components/app/permission-guard";
import { UnitsFilterBar } from "@/features/units/units-filter-bar";
import { UnitsImportButton } from "@/features/units/units-import-button";
import { loadUserContext, requireTenantPage } from "@/server/auth/context";
import { prisma } from "@/server/db/prisma";
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

function shownPricePerM2(unit: {
  pricePerSquareMeter: { toString(): string } | null;
  finalPrice: { toString(): string } | null;
  basePrice: { toString(): string } | null;
  totalArea: { toString(): string };
}) {
  if (unit.pricePerSquareMeter) return new Decimal(unit.pricePerSquareMeter.toString());
  const listed = unit.finalPrice ?? unit.basePrice;
  if (!listed) return null;
  const area = new Decimal(unit.totalArea.toString());
  if (area.isZero()) return new Decimal(0);
  return new Decimal(listed.toString()).div(area).toDecimalPlaces(2);
}

function shownTotalPrice(unit: {
  pricePerSquareMeter: { toString(): string } | null;
  finalPrice: { toString(): string } | null;
  basePrice: { toString(): string } | null;
  totalArea: { toString(): string };
}) {
  const area = new Decimal(unit.totalArea.toString());
  if (unit.pricePerSquareMeter && !area.isZero()) {
    return new Decimal(unit.pricePerSquareMeter.toString()).mul(area).toDecimalPlaces(2);
  }
  const listed = unit.finalPrice ?? unit.basePrice;
  return listed ? new Decimal(listed.toString()) : null;
}

function BuyerLink({
  buyer,
}: {
  buyer: {
    id: string;
    firstName: string;
    lastName: string;
    legalName: string | null;
  } | null;
}) {
  if (!buyer) return <span className="text-[var(--color-foreground-muted)]">—</span>;
  const name = buyer.legalName?.trim() || `${buyer.firstName} ${buyer.lastName}`.trim();
  return (
    <Link href={`/kupci/${buyer.id}`} className="text-[var(--color-brand-700)] hover:underline">
      {name}
    </Link>
  );
}

export default async function UnitsPage({ searchParams }: PageProps) {
  const ctx = await loadUserContext();
  requireTenantPage(ctx, { permission: "inventory.read", orgType: "INVESTOR" });

  const t = createT(ctx.user.locale);
  const sp = await searchParams;
  const search = first(sp.q);
  const projectId = first(sp.projectId);
  const buildingId = first(sp.buildingId);
  const status = csvArray(first(sp.status)) as UnitStatus[] | undefined;
  const type = csvArray(first(sp.type)) as UnitType[] | undefined;
  const page = Number(first(sp.page) ?? "1") || 1;
  const pageSize = 20;

  const [{ items, total }, projectsList, buildings] = await Promise.all([
    listUnits({
      organizationId: ctx.activeOrganization.id,
      page,
      pageSize,
      search,
      projectId,
      buildingId,
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
    prisma.building.findMany({
      where: {
        project: {
          organizationId: ctx.activeOrganization.id,
          archivedAt: null,
          ...(projectId ? { id: projectId } : {}),
        },
      },
      select: { id: true, name: true, code: true, project: { select: { name: true } } },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const listQuery = {
    ...(search ? { q: search } : {}),
    ...(projectId ? { projectId } : {}),
    ...(buildingId ? { buildingId } : {}),
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
          <PermissionGuard permission="inventory.import">
            <UnitsImportButton />
          </PermissionGuard>
          <PermissionGuard permission="inventory.export">
            <Button asChild variant="outline">
              <a
                href={`/api/v1/units/export?format=xlsx${projectId ? `&projectId=${projectId}` : ""}`}
              >
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
              buildingId: buildingId ?? "",
              status: first(sp.status) ?? "",
              type: first(sp.type) ?? "",
            }}
            projects={projectsList.items.map((p) => ({ id: p.id, name: p.name }))}
            buildings={buildings.map((building) => ({
              id: building.id,
              name: projectId
                ? building.name || building.code
                : `${building.name || building.code} · ${building.project.name}`,
            }))}
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
              <thead className="bg-[var(--color-surface-inset)] text-left text-xs tracking-wide text-[var(--color-foreground-muted)] uppercase">
                <tr>
                  <th className="px-4 py-3">{t("inventory.columns.code")}</th>
                  <th className="px-4 py-3">{t("units.columns.project")}</th>
                  <th className="px-4 py-3">{t("units.columns.building")}</th>
                  <th className="px-4 py-3">{t("units.columns.type")}</th>
                  <th className="px-4 py-3">{t("units.columns.area")}</th>
                  <th className="px-4 py-3">{t("units.columns.pricePerSquareMeter")}</th>
                  <th className="px-4 py-3">{t("units.detail.pricing")}</th>
                  <th className="px-4 py-3">{t("units.columns.buyer")}</th>
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
                      <Link href={`/projekti/${u.project.id}`} className="hover:underline">
                        {u.project.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{u.building?.name || u.building?.code || "—"}</td>
                    <td className="px-4 py-3">{unitTypeLabel(u.type, t)}</td>
                    <td className="px-4 py-3 tabular-nums">{u.totalArea.toString()} m²</td>
                    <td className="px-4 py-3 tabular-nums">
                      {shownPricePerM2(u)
                        ? formatMoney(shownPricePerM2(u)!, u.currency as "EUR" | "RSD")
                        : "—"}
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      {shownTotalPrice(u)
                        ? formatMoney(shownTotalPrice(u)!, u.currency as "EUR" | "RSD")
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <BuyerLink buyer={u.buyer} />
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
                    {u.project.name}
                    {u.building ? ` · ${u.building.name || u.building.code}` : ""} ·{" "}
                    {unitTypeLabel(u.type, t)}
                  </div>
                  <BuyerLink buyer={u.buyer} />
                  <div className="flex items-center justify-between text-sm">
                    <span>{u.totalArea.toString()} m²</span>
                    <span className="text-[var(--color-foreground-muted)]">
                      {shownPricePerM2(u)
                        ? `${formatMoney(shownPricePerM2(u)!, u.currency as "EUR" | "RSD")}/m²`
                        : "—"}
                    </span>
                    <span className="font-medium">
                      {shownTotalPrice(u)
                        ? formatMoney(shownTotalPrice(u)!, u.currency as "EUR" | "RSD")
                        : "—"}
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
