import Link from "next/link";

import { Card, CardContent } from "@/components/ui/card";
import { PermissionGuard } from "@/components/app/permission-guard";
import { loadUserContext, requireTenantPage } from "@/server/auth/context";
import { prisma } from "@/server/db/prisma";
import {
  listMaintenanceTickets,
  listSuppliers,
} from "@/server/services/manager/maintenance.service";
import { assertBuildingBelongsToOrg } from "@/server/services/manager/buildings.service";
import { formatDate } from "@/lib/formatters";
import { createT } from "@/lib/i18n";
import { NewTicketDialog } from "@/features/manager/ticket-forms";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function BuildingTicketsTab({ params }: Props) {
  const { id } = await params;
  const ctx = await loadUserContext();
  requireTenantPage(ctx, { permission: "building.read", orgType: "MANAGER" });
  const t = createT(ctx.user.locale);

  await assertBuildingBelongsToOrg(ctx.activeOrganization.id, id);

  const [{ items }, building, units, suppliers] = await Promise.all([
    listMaintenanceTickets({
      organizationId: ctx.activeOrganization.id,
      buildingId: id,
      page: 1,
      pageSize: 200,
    }),
    prisma.managedBuilding.findUnique({
      where: { id },
      select: { id: true, name: true },
    }),
    prisma.managedUnit.findMany({
      where: { organizationId: ctx.activeOrganization.id, buildingId: id, archivedAt: null },
      select: { id: true, code: true, buildingId: true },
      orderBy: { code: "asc" },
    }),
    listSuppliers({ organizationId: ctx.activeOrganization.id, buildingId: id }),
  ]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end gap-2">
        <PermissionGuard permission="ticket.manage">
          <NewTicketDialog
            buildings={building ? [building] : []}
            units={units}
            suppliers={suppliers.map((s) => ({ id: s.id, name: s.name }))}
            defaultBuildingId={id}
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
                  <td className="px-4 py-3 font-medium">{ticket.title}</td>
                  <td className="px-4 py-3 font-mono text-xs">{ticket.unit?.code ?? "—"}</td>
                  <td className="px-4 py-3 text-xs">
                    {t(`manager.tickets.priority.${ticket.priority}` as const)}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {t(`manager.tickets.status.${ticket.status}` as const)}
                  </td>
                  <td className="px-4 py-3 text-xs text-[var(--color-foreground-muted)]">
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
