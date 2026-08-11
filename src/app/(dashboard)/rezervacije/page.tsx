import Link from "next/link";
import { redirect } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { loadUserContext } from "@/server/auth/context";
import {
  listReservations,
  listReservationsBoard,
} from "@/server/services/reservations.service";
import { formatDate } from "@/lib/formatters";
import { ReservationsBoard } from "@/features/board/reservations-board";
import type { ReservationStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<ReservationStatus, string> = {
  REQUESTED: "Na čekanju",
  APPROVED: "Odobrena",
  REJECTED: "Odbijena",
  EXPIRED: "Istekla",
  CANCELED: "Otkazana",
  CONVERTED: "Pretvorena u prodaju",
};

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
  if (!ctx) redirect("/sign-in");
  if (!ctx.activeOrganization) redirect("/podesavanja");

  const sp = await searchParams;
  const view = readParam(sp.view) === "board" ? "board" : "list";
  const status = readParam(sp.status) as ReservationStatus | undefined;
  const page = Number(readParam(sp.page) ?? "1") || 1;
  const pageSize = 20;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Rezervacije</h1>
          <p className="text-sm text-[var(--color-foreground-muted)]">
            Zahtevi za rezervaciju i njihov status.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/rezervacije/zahtevi">Zahtevi sa javne ponude</Link>
          </Button>
          <ViewSwitcher view={view} status={status} />
        </div>
      </div>

      {view === "board" ? (
        <BoardView organizationId={ctx.activeOrganization.id} ctxPermissions={ctx.permissions} />
      ) : (
        <ListView
          organizationId={ctx.activeOrganization.id}
          status={status}
          page={page}
          pageSize={pageSize}
        />
      )}
    </div>
  );
}

function ViewSwitcher({
  view,
  status,
}: {
  view: "list" | "board";
  status: ReservationStatus | undefined;
}) {
  const query: Record<string, string> = {};
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
        Lista
      </Link>
      <Link
        href={{ pathname: "/rezervacije", query: { ...query, view: "board" } }}
        className={`px-3 py-1.5 ${
          view === "board"
            ? "bg-[var(--color-brand-600)] text-white"
            : "bg-white text-[var(--color-foreground)] hover:bg-[var(--color-surface-inset)]"
        }`}
      >
        Tabla
      </Link>
    </div>
  );
}

async function BoardView({
  organizationId,
  ctxPermissions,
}: {
  organizationId: string;
  ctxPermissions: readonly string[];
}) {
  const board = await listReservationsBoard({ organizationId });
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
  page,
  pageSize,
}: {
  organizationId: string;
  status: ReservationStatus | undefined;
  page: number;
  pageSize: number;
}) {
  const { items, total } = await listReservations({
    organizationId,
    page,
    pageSize,
    status: status ? [status] : undefined,
  });

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Filteri</CardTitle>
        </CardHeader>
        <CardContent>
          <form method="get" className="flex flex-wrap gap-2" action="/rezervacije">
            <select
              name="status"
              defaultValue={status ?? ""}
              className="h-10 rounded-md border border-[var(--color-border)] bg-white px-3 text-sm"
            >
              <option value="">Svi statusi</option>
              {(Object.entries(STATUS_LABELS) as [ReservationStatus, string][]).map(
                ([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ),
              )}
            </select>
            <Button type="submit" size="md">
              Primeni
            </Button>
            <Button asChild variant="outline">
              <Link href="/rezervacije">Poništi</Link>
            </Button>
          </form>
        </CardContent>
      </Card>

      {items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-[var(--color-foreground-muted)]">
            Nema rezervacija.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] md:block">
            <table className="min-w-full divide-y divide-[var(--color-border)] text-sm">
              <thead className="bg-[var(--color-surface-inset)] text-left text-xs uppercase tracking-wide text-[var(--color-foreground-muted)]">
                <tr>
                  <th className="px-4 py-3">Jedinica</th>
                  <th className="px-4 py-3">Projekat</th>
                  <th className="px-4 py-3">Kupac</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Kreirana</th>
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
                        {STATUS_LABELS[r.status]}
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
                      {STATUS_LABELS[r.status]}
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
                Strana {page} od {totalPages}
              </span>
              <div className="flex gap-2">
                {page > 1 ? (
                  <Button asChild variant="outline" size="sm">
                    <Link
                      href={{
                        pathname: "/rezervacije",
                        query: {
                          ...(status ? { status } : {}),
                          page: String(page - 1),
                        },
                      }}
                    >
                      Prethodna
                    </Link>
                  </Button>
                ) : null}
                {page < totalPages ? (
                  <Button asChild variant="outline" size="sm">
                    <Link
                      href={{
                        pathname: "/rezervacije",
                        query: {
                          ...(status ? { status } : {}),
                          page: String(page + 1),
                        },
                      }}
                    >
                      Sledeća
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
