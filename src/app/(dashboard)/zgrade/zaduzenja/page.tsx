import Link from "next/link";

import { Card, CardContent } from "@/components/ui/card";
import { loadUserContext, requireTenantPage } from "@/server/auth/context";
import { prisma } from "@/server/db/prisma";
import { formatDate, formatMoney } from "@/lib/formatters";
import { createT, type TranslateFn } from "@/lib/i18n";
import type { DuesChargeStatus } from "@prisma/client";

const STATUS_TONE: Record<DuesChargeStatus, string> = {
  OPEN: "bg-amber-100 text-amber-700",
  PARTIALLY_PAID: "bg-sky-100 text-sky-700",
  PAID: "bg-emerald-100 text-emerald-700",
  WRITTEN_OFF: "bg-neutral-200 text-neutral-700",
};

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function readParam(raw: string | string[] | undefined): string | undefined {
  if (Array.isArray(raw)) return raw[0];
  return raw;
}

export default async function DuesListPage({ searchParams }: PageProps) {
  const ctx = await loadUserContext();
  requireTenantPage(ctx, { permission: "dues.read", orgType: "MANAGER" });
  const t = createT(ctx.user.locale);
  const sp = await searchParams;
  const buildingId = readParam(sp.building);
  const statusRaw = readParam(sp.status);
  const status =
    statusRaw && ["OPEN", "PARTIALLY_PAID", "PAID", "WRITTEN_OFF"].includes(statusRaw)
      ? (statusRaw as DuesChargeStatus)
      : undefined;
  const page = Number(readParam(sp.page) ?? "1") || 1;
  const pageSize = 50;

  const [rows, total, buildings] = await Promise.all([
    prisma.duesCharge.findMany({
      where: {
        organizationId: ctx.activeOrganization.id,
        ...(buildingId ? { buildingId } : {}),
        ...(status ? { status } : {}),
      },
      include: {
        building: { select: { id: true, name: true } },
        unit: { select: { id: true, code: true } },
      },
      orderBy: [{ dueDate: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.duesCharge.count({
      where: {
        organizationId: ctx.activeOrganization.id,
        ...(buildingId ? { buildingId } : {}),
        ...(status ? { status } : {}),
      },
    }),
    prisma.managedBuilding.findMany({
      where: { organizationId: ctx.activeOrganization.id, archivedAt: null },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("manager.dues.title")}</h1>
        <p className="text-sm text-[var(--color-foreground-muted)]">{t("manager.dues.subtitle")}</p>
      </div>

      <Card>
        <CardContent>
          <form method="get" className="flex flex-wrap items-center gap-3 py-3">
            <select
              name="building"
              defaultValue={buildingId ?? ""}
              className="h-9 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-sm"
            >
              <option value="">{t("manager.dues.columns.building")}: —</option>
              {buildings.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            <select
              name="status"
              defaultValue={status ?? ""}
              className="h-9 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-sm"
            >
              <option value="">{t("manager.dues.columns.status")}: —</option>
              {(["OPEN", "PARTIALLY_PAID", "PAID", "WRITTEN_OFF"] as const).map((s) => (
                <option key={s} value={s}>
                  {t(`manager.dues.status.${s}` as const)}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="h-9 rounded-md bg-[var(--color-brand-700)] px-3 text-sm font-medium text-white hover:bg-[var(--color-brand-800)]"
            >
              {t("common.filter")}
            </button>
          </form>
        </CardContent>
      </Card>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-[var(--color-foreground-muted)]">
            {t("manager.dues.empty")}
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-md border border-[var(--color-border)] bg-[var(--color-surface)]">
          <table className="min-w-full divide-y divide-[var(--color-border)] text-sm">
            <thead className="bg-[var(--color-surface-inset)] text-left text-xs tracking-wide text-[var(--color-foreground-muted)] uppercase">
              <tr>
                <th className="px-4 py-3">{t("manager.dues.columns.building")}</th>
                <th className="px-4 py-3">{t("manager.dues.columns.unit")}</th>
                <th className="px-4 py-3">{t("manager.dues.columns.period")}</th>
                <th className="px-4 py-3">{t("manager.dues.columns.due")}</th>
                <th className="px-4 py-3 text-right">{t("manager.dues.columns.total")}</th>
                <th className="px-4 py-3 text-right">{t("manager.dues.columns.paid")}</th>
                <th className="px-4 py-3 text-right">{t("manager.dues.columns.outstanding")}</th>
                <th className="px-4 py-3">{t("manager.dues.columns.status")}</th>
                <th className="px-4 py-3 text-right">PDF</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {rows.map((r) => {
                const outstanding = (Number(r.totalAmount) - Number(r.paidAmount)).toFixed(2);
                return (
                  <tr key={r.id} className="hover:bg-[var(--color-surface-inset)]">
                    <td className="px-4 py-3">
                      <Link
                        href={`/zgrade/${r.building.id}`}
                        className="font-medium text-[var(--color-brand-700)] hover:underline"
                      >
                        {r.building.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{r.unit.code}</td>
                    <td className="px-4 py-3">
                      {String(r.periodYear).padStart(4, "0")}-
                      {String(r.periodMonth).padStart(2, "0")}
                    </td>
                    <td className="px-4 py-3 text-[var(--color-foreground-muted)]">
                      {formatDate(r.dueDate)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {formatMoney(r.totalAmount, "RSD")}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {formatMoney(r.paidAmount, "RSD")}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums">
                      {formatMoney(outstanding, "RSD")}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_TONE[r.status]}`}
                      >
                        {t(`manager.dues.status.${r.status}` as const)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <a
                        href={`/api/v1/manager/dues/${r.id}/pdf`}
                        className="text-xs text-[var(--color-brand-700)] hover:underline"
                      >
                        PDF
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 ? (
        <Pagination
          page={page}
          totalPages={totalPages}
          t={t}
          query={{
            ...(buildingId ? { building: buildingId } : {}),
            ...(status ? { status } : {}),
          }}
        />
      ) : null}
    </div>
  );
}

function Pagination({
  page,
  totalPages,
  t,
  query,
}: {
  page: number;
  totalPages: number;
  t: TranslateFn;
  query: Record<string, string>;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-[var(--color-foreground-muted)]">
        {t("inventory.pagination.pageOf", { page, total: totalPages })}
      </span>
      <div className="flex gap-2">
        {page > 1 ? (
          <Link
            href={{
              pathname: "/zgrade/zaduzenja",
              query: { ...query, page: String(page - 1) },
            }}
            className="rounded-md border border-[var(--color-border)] px-3 py-1"
          >
            {t("inventory.pagination.prev")}
          </Link>
        ) : null}
        {page < totalPages ? (
          <Link
            href={{
              pathname: "/zgrade/zaduzenja",
              query: { ...query, page: String(page + 1) },
            }}
            className="rounded-md border border-[var(--color-border)] px-3 py-1"
          >
            {t("inventory.pagination.next")}
          </Link>
        ) : null}
      </div>
    </div>
  );
}
