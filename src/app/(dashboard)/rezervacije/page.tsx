import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { loadUserContext, requireTenantPage } from "@/server/auth/context";
import { listReservations, listReservationsBoard } from "@/server/services/reservations.service";
import { formatDate } from "@/lib/formatters";
import { ReservationsBoard } from "@/features/board/reservations-board";
import { ReservationsFilterBar } from "@/features/reservations/reservations-filter-bar";
import { createT, enumLabel, type TranslateFn } from "@/lib/i18n";
import type { ReservationStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const RESERVATION_STATUSES: ReservationStatus[] = [
  "REQUESTED",
  "APPROVED",
  "REJECTED",
  "EXPIRED",
  "CANCELED",
  "CONVERTED",
];

const STATUS_TONE: Record<ReservationStatus, string> = {
  REQUESTED: "bg-amber-100 text-amber-700",
  APPROVED: "bg-emerald-100 text-emerald-700",
  REJECTED: "bg-rose-100 text-rose-700",
  EXPIRED: "bg-neutral-200 text-neutral-700",
  CANCELED: "bg-neutral-200 text-neutral-700",
  CONVERTED: "bg-indigo-100 text-indigo-700",
};

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function readParam(raw: string | string[] | undefined): string | undefined {
  return Array.isArray(raw) ? raw[0] : raw;
}

export default async function RezervacijePage({ searchParams }: PageProps) {
  const ctx = await loadUserContext();
  requireTenantPage(ctx, { permission: "reservation.read", orgType: "INVESTOR" });

  const t = createT(ctx.user.locale);
  const sp = await searchParams;
  const view = readParam(sp.view) === "board" ? "board" : "list";
  const status = readParam(sp.status) as ReservationStatus | undefined;
  const q = readParam(sp.q)?.trim() ?? "";
  const page = Number(readParam(sp.page) ?? "1") || 1;
  const pageSize = 20;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{t("nav.reservations")}</h1>
          <p className="text-sm text-[var(--color-foreground-muted)]">
            {t("deals.reservations.subtitle")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/rezervacije/zahtevi">{t("deals.reservations.publicRequests")}</Link>
          </Button>
          <ViewSwitcher view={view} status={status} q={q} t={t} />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{t("common.filter")}</CardTitle>
        </CardHeader>
        <CardContent>
          <ReservationsFilterBar
            q={q}
            status={status ?? ""}
            view={view}
            statusOptions={RESERVATION_STATUSES.map((value) => ({
              value,
              label: enumLabel("reservation", value, t),
            }))}
          />
        </CardContent>
      </Card>

      {view === "board" ? (
        <BoardView
          organizationId={ctx.activeOrganization.id}
          ctxPermissions={ctx.permissions}
          search={q}
          t={t}
        />
      ) : (
        <ListView
          organizationId={ctx.activeOrganization.id}
          status={status}
          search={q}
          page={page}
          pageSize={pageSize}
          t={t}
        />
      )}
    </div>
  );
}

function ViewSwitcher({
  view,
  status,
  q,
  t,
}: {
  view: "list" | "board";
  status: ReservationStatus | undefined;
  q: string;
  t: TranslateFn;
}) {
  const query: Record<string, string> = {};
  if (q) query.q = q;
  if (status) query.status = status;
  return (
    <div className="inline-flex overflow-hidden rounded-md border border-[var(--color-border)] text-sm">
      <Link
        href={{ pathname: "/rezervacije", query }}
        className={`px-3 py-1.5 ${
          view === "list"
            ? "bg-[var(--color-brand-600)] text-white"
            : "bg-white text-[var(--color-foreground)] hover:bg-[var(--color-surface-inset)]"
        }`}
      >
        {t("common.list")}
      </Link>
      <Link
        href={{ pathname: "/rezervacije", query: { ...query, view: "board" } }}
        className={`px-3 py-1.5 ${
          view === "board"
            ? "bg-[var(--color-brand-600)] text-white"
            : "bg-white text-[var(--color-foreground)] hover:bg-[var(--color-surface-inset)]"
        }`}
      >
        {t("common.board")}
      </Link>
    </div>
  );
}

async function BoardView({
  organizationId,
  ctxPermissions,
  search,
  t,
}: {
  organizationId: string;
  ctxPermissions: readonly string[];
  search: string;
  t: TranslateFn;
}) {
  const board = await listReservationsBoard({
    organizationId,
    search: search || undefined,
  });
  // Serialise dates for the client boundary — RSC won't let us pass
  // `Date` instances through to a `"use client"` boundary directly.
  const columns = board.map((col) => ({
    status: col.status,
    total: col.total,
    cards: col.cards.map((c) => ({
      ...c,
      createdAt: c.createdAt.toISOString(),
      expiresAt: c.expiresAt ? c.expiresAt.toISOString() : null,
    })),
  }));
  if (search && columns.every((col) => col.total === 0)) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-[var(--color-foreground-muted)]">
          {t("deals.reservations.searchEmpty")}
        </CardContent>
      </Card>
    );
  }

  return (
    <ReservationsBoard
      columns={columns}
      canApprove={ctxPermissions.includes("reservation.approve")}
      canManageSales={ctxPermissions.includes("sale.manage")}
    />
  );
}

async function ListView({
  organizationId,
  status,
  search,
  page,
  pageSize,
  t,
}: {
  organizationId: string;
  status: ReservationStatus | undefined;
  search: string;
  page: number;
  pageSize: number;
  t: TranslateFn;
}) {
  const { items, total } = await listReservations({
    organizationId,
    page,
    pageSize,
    status: status ? [status] : undefined,
    search: search || undefined,
  });

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const listQuery = {
    ...(search ? { q: search } : {}),
    ...(status ? { status } : {}),
  };

  return (
    <>
      {items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-[var(--color-foreground-muted)]">
            {search ? t("deals.reservations.searchEmpty") : t("deals.reservations.empty")}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] md:block">
            <table className="min-w-full divide-y divide-[var(--color-border)] text-sm">
              <thead className="bg-[var(--color-surface-inset)] text-left text-xs tracking-wide text-[var(--color-foreground-muted)] uppercase">
                <tr>
                  <th className="px-4 py-3">{t("deals.unit")}</th>
                  <th className="px-4 py-3">{t("units.columns.project")}</th>
                  <th className="px-4 py-3">{t("deals.buyer")}</th>
                  <th className="px-4 py-3">{t("common.statusLabel")}</th>
                  <th className="px-4 py-3 text-right">{t("deals.created")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {items.map((r) => (
                  <tr key={r.id} className="hover:bg-[var(--color-surface-inset)]">
                    <td className="px-4 py-3">
                      <Link
                        href={`/rezervacije/${r.id}`}
                        className="font-medium text-[var(--color-brand-700)] hover:underline"
                      >
                        {r.unit?.code ?? "—"}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{r.project?.name ?? "—"}</td>
                    <td className="px-4 py-3">
                      {r.buyer ? `${r.buyer.firstName} ${r.buyer.lastName}` : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_TONE[r.status]}`}
                      >
                        {enumLabel("reservation", r.status, t)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-[var(--color-foreground-muted)]">
                      {formatDate(r.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid gap-3 md:hidden">
            {items.map((r) => (
              <Card key={r.id}>
                <CardContent className="space-y-2 py-3">
                  <div className="flex items-center justify-between">
                    <Link
                      href={`/rezervacije/${r.id}`}
                      className="font-semibold text-[var(--color-brand-700)]"
                    >
                      {r.unit?.code ?? "—"}
                    </Link>
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_TONE[r.status]}`}
                    >
                      {enumLabel("reservation", r.status, t)}
                    </span>
                  </div>
                  <div className="text-xs text-[var(--color-foreground-muted)]">
                    {r.project?.name ?? "—"} ·{" "}
                    {r.buyer ? `${r.buyer.firstName} ${r.buyer.lastName}` : "—"}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {totalPages > 1 ? (
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--color-foreground-muted)]">
                {t("deals.pageOf", { page, total: totalPages })}
              </span>
              <div className="flex gap-2">
                {page > 1 ? (
                  <Button asChild variant="outline" size="sm">
                    <Link
                      href={{
                        pathname: "/rezervacije",
                        query: {
                          ...listQuery,
                          page: String(page - 1),
                        },
                      }}
                    >
                      {t("common.previous")}
                    </Link>
                  </Button>
                ) : null}
                {page < totalPages ? (
                  <Button asChild variant="outline" size="sm">
                    <Link
                      href={{
                        pathname: "/rezervacije",
                        query: {
                          ...listQuery,
                          page: String(page + 1),
                        },
                      }}
                    >
                      {t("common.next")}
                    </Link>
                  </Button>
                ) : null}
              </div>
            </div>
          ) : null}
        </>
      )}
    </>
  );
}
