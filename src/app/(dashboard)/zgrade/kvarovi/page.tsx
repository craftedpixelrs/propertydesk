import Link from "next/link";

import { Card, CardContent } from "@/components/ui/card";
import { PermissionGuard } from "@/components/app/permission-guard";
import { loadUserContext, requireTenantPage } from "@/server/auth/context";
import { prisma } from "@/server/db/prisma";
import {
  listMaintenanceTickets,
  listSuppliers,
} from "@/server/services/manager/maintenance.service";
import { formatDate } from "@/lib/formatters";
import { createT } from "@/lib/i18n";
import type { MaintenancePriority, MaintenanceStatus } from "@prisma/client";
import { NewTicketDialog } from "@/features/manager/ticket-forms";

const PRIORITY_TONE: Record<MaintenancePriority, string> = {
  LOW: "bg-slate-100 text-slate-700",
  NORMAL: "bg-sky-100 text-sky-700",
  HIGH: "bg-amber-100 text-amber-700",
  URGENT: "bg-red-100 text-red-700",
};

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
  const page = Number(readParam(sp.page) ?? "1") || 1;
  const pageSize = 50;

  const [{ items }, buildings, allUnits, suppliers] = await Promise.all([
    listMaintenanceTickets({
      organizationId: ctx.activeOrganization.id,
      status,
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
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{t("manager.tickets.title")}</h1>
          <p className="text-sm text-[var(--color-foreground-muted)]">
            {t("manager.tickets.subtitle")}
          </p>
        </div>
        <PermissionGuard permission="ticket.manage">
          <NewTicketDialog
            buildings={buildings}
            units={allUnits}
            suppliers={suppliers.map((s) => ({ id: s.id, name: s.name }))}
          />
        </PermissionGuard>
      </div>

      {items.length === 0 ? (
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
                <th className="px-4 py-3">{t("manager.tickets.columns.priority")}</th>
                <th className="px-4 py-3">{t("manager.tickets.columns.status")}</th>
                <th className="px-4 py-3">{t("manager.tickets.columns.createdAt")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {items.map((ticket) => (
                <tr key={ticket.id} className="hover:bg-[var(--color-surface-inset)]">
                  <td className="px-4 py-3 font-mono text-xs">
                    <Link
                      href={`/zgrade/kvarovi/${ticket.id}`}
                      className="text-[var(--color-brand-700)] hover:underline"
                    >
                      {ticket.code}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-medium">
                    <Link href={`/zgrade/kvarovi/${ticket.id}`} className="hover:underline">
                      {ticket.title}
                    </Link>
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
    </div>
  );
}
