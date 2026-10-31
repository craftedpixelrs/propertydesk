import Link from "next/link";

import { Card, CardContent } from "@/components/ui/card";
import { PermissionGuard } from "@/components/app/permission-guard";
import { loadUserContext, requireTenantPage } from "@/server/auth/context";
import { prisma } from "@/server/db/prisma";
import {
  getTicketDrawer,
  listMaintenanceTickets,
  listSuppliers,
} from "@/server/services/manager/maintenance.service";
import { OpenTicketButton, TicketDrawer } from "@/features/manager/ticket-drawer";
import { formatDate } from "@/lib/formatters";
import { createT } from "@/lib/i18n";
import type { MaintenanceCategory, MaintenancePriority, MaintenanceStatus } from "@prisma/client";
import { NewTicketDialog } from "@/features/manager/ticket-forms";
import { TicketsKanban } from "@/features/manager/tickets-kanban";

const PRIORITY_TONE: Record<MaintenancePriority, string> = {
  LOW: "bg-slate-100 text-slate-700",
  NORMAL: "bg-sky-100 text-sky-700",
  HIGH: "bg-amber-100 text-amber-700",
  URGENT: "bg-red-100 text-red-700",
};

const CATEGORIES: MaintenanceCategory[] = [
  "PLUMBING",
  "ELECTRICAL",
  "HEATING",
  "ELEVATOR",
  "COMMON_AREAS",
  "ROOF",
  "FACADE",
  "SECURITY",
  "CLEANING",
  "OTHER",
];

const STATUS_TONE: Record<MaintenanceStatus, string> = {
  OPEN: "bg-amber-100 text-amber-700",
  TRIAGED: "bg-sky-100 text-sky-700",
  IN_PROGRESS: "bg-indigo-100 text-indigo-700",
  AWAITING_PARTS: "bg-purple-100 text-purple-700",
  COMPLETED: "bg-emerald-100 text-emerald-700",
  CANCELED: "bg-neutral-200 text-neutral-700",
};

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function readParam(raw: string | string[] | undefined): string | undefined {
  if (Array.isArray(raw)) return raw[0];
  return raw;
}

export default async function TicketsListPage({ searchParams }: PageProps) {
  const ctx = await loadUserContext();
  requireTenantPage(ctx, { permission: "ticket.read", orgType: "MANAGER" });
  const t = createT(ctx.user.locale);

  const sp = await searchParams;
  const statusRaw = readParam(sp.status);
  const status = (
    ["OPEN", "TRIAGED", "IN_PROGRESS", "AWAITING_PARTS", "COMPLETED", "CANCELED"] as const
  ).includes(statusRaw as MaintenanceStatus)
    ? (statusRaw as MaintenanceStatus)
    : undefined;
  const buildingId = readParam(sp.buildingId);
  const categoryRaw = readParam(sp.category);
  const category = CATEGORIES.includes(categoryRaw as MaintenanceCategory)
    ? (categoryRaw as MaintenanceCategory)
    : undefined;
  const page = Number(readParam(sp.page) ?? "1") || 1;
  const ticketId = readParam(sp.ticket);
  const viewMode = readParam(sp.view) === "board" ? "board" : "list";
  // The board shows every open status side-by-side; pulling a larger page
  // keeps drag-and-drop meaningful without duplicating pagination there.
  const pageSize = viewMode === "board" ? 500 : 50;

  const [{ items }, buildings, allUnits, suppliers, drawer] = await Promise.all([
    listMaintenanceTickets({
      organizationId: ctx.activeOrganization.id,
      status: viewMode === "board" ? undefined : status,
      buildingId,
      category,
      page,
      pageSize,
    }),
    prisma.managedBuilding.findMany({
      where: { organizationId: ctx.activeOrganization.id, archivedAt: null },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.managedUnit.findMany({
      where: { organizationId: ctx.activeOrganization.id, archivedAt: null },
      select: { id: true, code: true, buildingId: true },
      orderBy: { code: "asc" },
      take: 2000,
    }),
    listSuppliers({ organizationId: ctx.activeOrganization.id }),
    ticketId ? getTicketDrawer(ctx.activeOrganization.id, ticketId) : Promise.resolve(null),
  ]);

  function listHref(mode: "list" | "board") {
    const params = new URLSearchParams();
    if (mode === "board") params.set("view", "board");
    if (buildingId) params.set("buildingId", buildingId);
    if (category) params.set("category", category);
    if (mode === "list" && status) params.set("status", status);
    if (ticketId) params.set("ticket", ticketId);
    const query = params.toString();
    return query ? `/zgrade/kvarovi?${query}` : "/zgrade/kvarovi";
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{t("manager.tickets.title")}</h1>
          <p className="text-sm text-[var(--color-foreground-muted)]">
            {t("manager.tickets.subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex overflow-hidden rounded-md border border-[var(--color-border)] text-xs">
            <Link
              href={listHref("list")}
              className={`px-3 py-1.5 ${
                viewMode === "list"
                  ? "bg-[var(--color-brand-700)] text-white"
                  : "bg-[var(--color-surface)]"
              }`}
            >
              {t("manager.ticket.listView")}
            </Link>
            <Link
              href={listHref("board")}
              className={`px-3 py-1.5 ${
                viewMode === "board"
                  ? "bg-[var(--color-brand-700)] text-white"
                  : "bg-[var(--color-surface)]"
              }`}
            >
              {t("manager.ticket.boardView")}
            </Link>
          </div>
          <PermissionGuard permission="ticket.manage">
            <NewTicketDialog
              buildings={buildings}
              units={allUnits}
              suppliers={suppliers.map((s) => ({ id: s.id, name: s.name }))}
            />
          </PermissionGuard>
        </div>
      </div>

      <form method="get" className="flex flex-wrap items-end gap-2 text-sm">
        {viewMode === "board" ? <input type="hidden" name="view" value="board" /> : null}
        <label className="space-y-1">
          <span className="block text-xs text-[var(--color-foreground-muted)]">
            {t("manager.ticket.filterBuilding")}
          </span>
          <select
            name="buildingId"
            defaultValue={buildingId ?? ""}
            className="h-9 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2"
          >
            <option value="">{t("manager.ticket.filterAll")}</option>
            {buildings.map((building) => (
              <option key={building.id} value={building.id}>
                {building.name}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1">
          <span className="block text-xs text-[var(--color-foreground-muted)]">
            {t("manager.ticket.filterCategory")}
          </span>
          <select
            name="category"
            defaultValue={category ?? ""}
            className="h-9 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2"
          >
            <option value="">{t("manager.ticket.filterAll")}</option>
            {CATEGORIES.map((item) => (
              <option key={item} value={item}>
                {t(`manager.ticket.categories.${item}`)}
              </option>
            ))}
          </select>
        </label>
        {viewMode === "list" ? (
          <label className="space-y-1">
            <span className="block text-xs text-[var(--color-foreground-muted)]">
              {t("manager.ticket.filterStatus")}
            </span>
            <select
              name="status"
              defaultValue={status ?? ""}
              className="h-9 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2"
            >
              <option value="">{t("manager.ticket.filterAll")}</option>
              {(
                [
                  "OPEN",
                  "TRIAGED",
                  "IN_PROGRESS",
                  "AWAITING_PARTS",
                  "COMPLETED",
                  "CANCELED",
                ] as const
              ).map((item) => (
                <option key={item} value={item}>
                  {t(`manager.tickets.status.${item}`)}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <button
          type="submit"
          className="h-9 rounded-md border border-[var(--color-border)] px-3 text-sm"
        >
          {t("manager.ticket.filterApply")}
        </button>
      </form>

      {viewMode === "board" ? (
        <TicketsKanban
          activeId={drawer?.id ?? null}
          tickets={items.map((t) => ({
            id: t.id,
            code: t.code,
            title: t.title,
            priority: t.priority,
            status: t.status,
            buildingName: t.building.name,
            unitCode: t.unit?.code ?? null,
          }))}
        />
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-[var(--color-foreground-muted)]">
            {t("manager.tickets.empty")}
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-md border border-[var(--color-border)] bg-[var(--color-surface)]">
          <table className="min-w-full divide-y divide-[var(--color-border)] text-sm">
            <thead className="bg-[var(--color-surface-inset)] text-left text-xs tracking-wide text-[var(--color-foreground-muted)] uppercase">
              <tr>
                <th className="px-4 py-3">{t("manager.tickets.columns.code")}</th>
                <th className="px-4 py-3">{t("manager.tickets.columns.title")}</th>
                <th className="px-4 py-3">{t("manager.tickets.columns.building")}</th>
                <th className="px-4 py-3">{t("manager.tickets.columns.unit")}</th>
                <th className="px-4 py-3">{t("manager.tickets.columns.category")}</th>
                <th className="px-4 py-3">{t("manager.tickets.columns.priority")}</th>
                <th className="px-4 py-3">{t("manager.tickets.columns.status")}</th>
                <th className="px-4 py-3">{t("manager.tickets.columns.createdAt")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {items.map((ticket) => (
                <tr
                  key={ticket.id}
                  className={
                    drawer?.id === ticket.id
                      ? "bg-[var(--color-surface-inset)]"
                      : "hover:bg-[var(--color-surface-inset)]"
                  }
                >
                  <td className="px-4 py-3 font-mono text-xs">
                    <OpenTicketButton
                      ticketId={ticket.id}
                      className="text-[var(--color-brand-700)] hover:underline"
                    >
                      {ticket.code}
                    </OpenTicketButton>
                  </td>
                  <td className="px-4 py-3 font-medium">
                    <OpenTicketButton ticketId={ticket.id} className="text-left hover:underline">
                      {ticket.title}
                    </OpenTicketButton>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/zgrade/${ticket.building.id}`}
                      className="text-[var(--color-brand-700)] hover:underline"
                    >
                      {ticket.building.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{ticket.unit?.code ?? "—"}</td>
                  <td className="px-4 py-3 text-xs">
                    {t(`manager.ticket.categories.${ticket.category}`)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_TONE[ticket.priority]}`}
                    >
                      {t(`manager.tickets.priority.${ticket.priority}` as const)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_TONE[ticket.status]}`}
                    >
                      {t(`manager.tickets.status.${ticket.status}` as const)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[var(--color-foreground-muted)]">
                    {formatDate(ticket.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <TicketDrawer
        ticket={drawer}
        suppliers={suppliers.map((supplier) => ({ id: supplier.id, name: supplier.name }))}
      />
    </div>
  );
}
