import Link from "next/link";
import { notFound } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PermissionGuard } from "@/components/app/permission-guard";
import { loadUserContext, requireTenantPage } from "@/server/auth/context";
import { getMaintenanceTicket, listSuppliers } from "@/server/services/manager/maintenance.service";
import { listDocuments } from "@/server/services/documents.service";
import { listOrgMembersWithPermission } from "@/server/services/manager/members";
import { isDomainError } from "@/lib/errors";
import { formatDateTime, formatMoney } from "@/lib/formatters";
import { createT } from "@/lib/i18n";
import {
  ChangeTicketStatusDialog,
  EditTicketDialog,
  UploadTicketPhotoButton,
} from "@/features/manager/ticket-forms";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function TicketDetailPage({ params }: Props) {
  const { id } = await params;
  const ctx = await loadUserContext();
  requireTenantPage(ctx, { permission: "ticket.read", orgType: "MANAGER" });
  const t = createT(ctx.user.locale);

  let ticket: Awaited<ReturnType<typeof getMaintenanceTicket>>;
  try {
    ticket = await getMaintenanceTicket(ctx.activeOrganization.id, id);
  } catch (err) {
    if (isDomainError(err) && err.code === "NOT_FOUND") return notFound();
    throw err;
  }

  const [suppliers, photos, assigneeMembers] = await Promise.all([
    listSuppliers({ organizationId: ctx.activeOrganization.id, buildingId: ticket.buildingId }),
    listDocuments({
      organizationId: ctx.activeOrganization.id,
      entityType: "MaintenanceTicket",
      entityId: ticket.id,
      imagesOnly: true,
      page: 1,
      pageSize: 50,
    }),
    listOrgMembersWithPermission(ctx.activeOrganization.id, "ticket.manage"),
  ]);
  const assignees = assigneeMembers.map((m) => ({
    id: m.userId,
    name: m.name ?? m.email,
  }));
  const assigneeName = assignees.find((a) => a.id === ticket.assignedToUserId)?.name ?? null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs text-[var(--color-foreground-muted)] uppercase">
            {t("manager.tickets.title")} · {ticket.code}
          </div>
          <h1 className="text-2xl font-semibold">{ticket.title}</h1>
          <div className="text-sm text-[var(--color-foreground-muted)]">
            {ticket.building.name} · {ticket.unit ? ticket.unit.code : t("manager.ticket.noUnit")} ·{" "}
            {t(`manager.tickets.status.${ticket.status}` as const)} ·{" "}
            {t(`manager.tickets.priority.${ticket.priority}` as const)}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <PermissionGuard permission="ticket.manage">
            <EditTicketDialog
              ticket={{
                id: ticket.id,
                title: ticket.title,
                description: ticket.description,
                category: ticket.category,
                priority: ticket.priority,
                assignedToUserId: ticket.assignedToUserId,
                supplierId: ticket.supplierId,
                estimatedCost: ticket.estimatedCost ? ticket.estimatedCost.toString() : null,
                actualCost: ticket.actualCost ? ticket.actualCost.toString() : null,
                fund: ticket.fund,
              }}
              assignees={assignees}
              suppliers={suppliers.map((s) => ({ id: s.id, name: s.name }))}
            />
            <ChangeTicketStatusDialog
              ticketId={ticket.id}
              currentStatus={ticket.status}
              suppliers={suppliers.map((s) => ({ id: s.id, name: s.name }))}
            />
            <UploadTicketPhotoButton ticketId={ticket.id} />
          </PermissionGuard>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t("manager.ticket.detailTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label={t("manager.tickets.columns.code")} value={ticket.code} />
            <Row label={t("manager.tickets.columns.building")} value={ticket.building.name} />
            <Row
              label={t("manager.tickets.columns.unit")}
              value={ticket.unit ? ticket.unit.code : t("manager.ticket.noUnit")}
            />
            <Row label={t("manager.ticket.categoryField")} value={ticket.category} />
            <Row
              label={t("manager.ticket.priorityField")}
              value={t(`manager.tickets.priority.${ticket.priority}` as const)}
            />
            <Row
              label={t("manager.tickets.columns.status")}
              value={t(`manager.tickets.status.${ticket.status}` as const)}
            />
            <Row
              label={t("manager.ticket.assigneeField")}
              value={assigneeName ?? `— ${t("manager.ticket.noAssignee")} —`}
            />
            <Row label={t("manager.ticket.supplierField")} value={ticket.supplier?.name ?? "—"} />
            <Row
              label={t("manager.ticket.estimatedCostField")}
              value={ticket.estimatedCost ? formatMoney(ticket.estimatedCost, "RSD") : "—"}
            />
            <Row
              label={t("manager.ticket.actualCostField")}
              value={ticket.actualCost ? formatMoney(ticket.actualCost, "RSD") : "—"}
            />
            <Row label={t("manager.ticket.fundField")} value={ticket.fund ?? "—"} />
            <Row label="Kreirano" value={formatDateTime(ticket.createdAt)} />
            {ticket.completedAt ? (
              <Row label="Završeno" value={formatDateTime(ticket.completedAt)} />
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t("manager.ticket.descriptionField")}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm whitespace-pre-wrap">
            {ticket.description ?? "—"}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{t("manager.ticket.statusHistory")}</CardTitle>
        </CardHeader>
        <CardContent>
          {ticket.history.length === 0 ? (
            <p className="text-sm text-[var(--color-foreground-muted)]">—</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {ticket.history.map((h) => (
                <li key={h.id} className="border-b border-[var(--color-border)] pb-2">
                  <div className="flex items-center justify-between gap-2 text-xs text-[var(--color-foreground-muted)]">
                    <span>
                      {h.fromStatus ? `${h.fromStatus} → ` : ""}
                      {h.toStatus}
                    </span>
                    <span>{formatDateTime(h.createdAt)}</span>
                  </div>
                  {h.note ? <p className="mt-1 whitespace-pre-wrap">{h.note}</p> : null}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{t("manager.ticket.photosTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          {photos.items.length === 0 ? (
            <p className="text-sm text-[var(--color-foreground-muted)]">
              {t("manager.ticket.photosEmpty")}
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {photos.items.map((p) => (
                <a
                  key={p.id}
                  href={`/api/v1/documents/${p.id}/download`}
                  target="_blank"
                  rel="noreferrer"
                  className="group block overflow-hidden rounded-md border border-[var(--color-border)]"
                >
                  <div className="aspect-square bg-[var(--color-surface-inset)]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/api/v1/documents/${p.id}/download`}
                      alt={p.fileName}
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    />
                  </div>
                  <div className="truncate px-2 py-1 text-xs text-[var(--color-foreground-muted)]">
                    {p.fileName}
                  </div>
                </a>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Link
        href={`/zgrade/${ticket.buildingId}/kvarovi`}
        className="inline-block text-sm text-[var(--color-brand-700)] hover:underline"
      >
        ← Nazad na kvarove zgrade
      </Link>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-[var(--color-border)] py-1 last:border-b-0">
      <span className="text-xs text-[var(--color-foreground-muted)] uppercase">{label}</span>
      <span className="min-w-0 flex-1 text-right">{value}</span>
    </div>
  );
}
