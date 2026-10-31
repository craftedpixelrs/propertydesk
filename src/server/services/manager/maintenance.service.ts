import "server-only";
import {
  Prisma,
  type MaintenanceCategory,
  type MaintenancePriority,
  type MaintenanceStatus,
  type BuildingExpenseFund,
} from "@prisma/client";
import Decimal from "decimal.js";

import { prisma } from "@/server/db/prisma";
import { DomainErrors } from "@/lib/errors";
import { recordAudit } from "@/server/audit/audit";
import { logger } from "@/server/logger";
import { assertBuildingBelongsToOrg } from "@/server/services/manager/buildings.service";
import { listOrgMembersWithPermission } from "@/server/services/manager/members";
import { notify, notifyMany } from "@/server/services/notifications.service";
import { sendEmail } from "@/server/auth/email";
import { appOrigin } from "@/server/http/app-origin";
import { publishLinkedNotice } from "@/server/services/manager/notices.service";

/**
 * Faza 11 — maintenance tickets ("kvarovi") + suppliers + per-fund expenses.
 *
 * Lifecycle:
 *   OPEN → TRIAGED → IN_PROGRESS → AWAITING_PARTS? → COMPLETED
 *                                  ↳ CANCELED (any time)
 *
 * On status change we persist a `MaintenanceTicketHistory` row and emit an
 * audit entry. On `COMPLETED`, if the operator supplied an `actualCost` +
 * `fund`, we create a matching `BuildingExpense` so monthly fund reports
 * stay accurate without a second data-entry step.
 */

// ---------------------------------------------------------------------------
// Tickets
// ---------------------------------------------------------------------------

export interface ListTicketsInput {
  organizationId: string;
  buildingId?: string;
  status?: MaintenanceStatus;
  priority?: MaintenancePriority;
  category?: MaintenanceCategory;
  page: number;
  pageSize: number;
}

export async function listMaintenanceTickets(input: ListTicketsInput) {
  const page = Math.max(1, input.page);
  const pageSize = Math.min(200, Math.max(1, input.pageSize));

  const where: Prisma.MaintenanceTicketWhereInput = {
    organizationId: input.organizationId,
    ...(input.buildingId ? { buildingId: input.buildingId } : {}),
    ...(input.status ? { status: input.status } : {}),
    ...(input.priority ? { priority: input.priority } : {}),
    ...(input.category ? { category: input.category } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.maintenanceTicket.findMany({
      where,
      include: {
        building: { select: { id: true, name: true } },
        unit: { select: { id: true, code: true } },
        supplier: { select: { id: true, name: true } },
      },
      orderBy: [{ status: "asc" }, { priority: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.maintenanceTicket.count({ where }),
  ]);

  return { items, total };
}

export async function getMaintenanceTicket(organizationId: string, ticketId: string) {
  const ticket = await prisma.maintenanceTicket.findFirst({
    where: { id: ticketId, organizationId },
    include: {
      building: true,
      unit: { include: { entrance: { select: { id: true, code: true } } } },
      supplier: true,
      history: { orderBy: { createdAt: "desc" } },
      workEntries: { orderBy: { createdAt: "desc" } },
      expenses: { orderBy: { spentAt: "desc" } },
      notices: {
        orderBy: { createdAt: "desc" },
        select: { id: true, title: true, publishedAt: true },
      },
    },
  });
  if (!ticket) throw DomainErrors.notFound("Prijava nije pronađena.");
  return ticket;
}

/**
 * Slim dossier for the list/board side panel. Missing ids return null so a
 * stale `?ticket=` link does not take down the list.
 */
export async function getTicketDrawer(organizationId: string, ticketId: string) {
  const ticket = await prisma.maintenanceTicket.findFirst({
    where: { id: ticketId, organizationId },
    include: {
      building: { select: { id: true, name: true } },
      unit: {
        select: {
          id: true,
          code: true,
          floor: true,
          entrance: { select: { code: true } },
        },
      },
      supplier: { select: { id: true, name: true } },
      history: { orderBy: { createdAt: "desc" }, take: 12 },
      workEntries: { orderBy: { createdAt: "desc" }, take: 5 },
    },
  });
  if (!ticket) return null;

  const actorIds = Array.from(
    new Set(
      [
        ticket.reportedByUserId,
        ticket.assignedToUserId,
        ...ticket.history.map((row) => row.changedByUserId),
        ...ticket.workEntries.map((row) => row.createdByUserId),
      ].filter((id): id is string => Boolean(id)),
    ),
  );
  const [reporter, actors] = await Promise.all([
    ticket.reportedByPersonId
      ? prisma.buildingPerson.findFirst({
          where: { id: ticket.reportedByPersonId, organizationId },
          select: { legalName: true, firstName: true, lastName: true, email: true, phone: true },
        })
      : Promise.resolve(null),
    actorIds.length > 0
      ? prisma.user.findMany({
          where: { id: { in: actorIds } },
          select: { id: true, name: true, email: true },
        })
      : Promise.resolve([]),
  ]);
  const actorName = new Map(actors.map((user) => [user.id, user.name ?? user.email]));
  const residentName = reporter
    ? (reporter.legalName ??
      ([reporter.firstName, reporter.lastName].filter(Boolean).join(" ") || reporter.email || "—"))
    : null;

  return {
    id: ticket.id,
    code: ticket.code,
    title: ticket.title,
    description: ticket.description,
    status: ticket.status,
    priority: ticket.priority,
    category: ticket.category,
    buildingId: ticket.building.id,
    buildingName: ticket.building.name,
    unitId: ticket.unit?.id ?? null,
    unitCode: ticket.unit?.code ?? null,
    entranceCode: ticket.unit?.entrance?.code ?? null,
    floor: ticket.unit?.floor != null ? String(ticket.unit.floor) : null,
    reporterName:
      residentName ??
      (ticket.reportedByUserId ? (actorName.get(ticket.reportedByUserId) ?? null) : null),
    reporterKind: residentName
      ? ("resident" as const)
      : ticket.reportedByUserId
        ? ("staff" as const)
        : ("none" as const),
    reporterEmail: reporter?.email ?? null,
    reporterPhone: reporter?.phone ?? null,
    assigneeName: ticket.assignedToUserId ? (actorName.get(ticket.assignedToUserId) ?? null) : null,
    supplierName: ticket.supplier?.name ?? null,
    openedAt: ticket.createdAt.toISOString(),
    closedAt: ticket.completedAt?.toISOString() ?? null,
    history: ticket.history.map((row) => ({
      id: row.id,
      fromStatus: row.fromStatus,
      toStatus: row.toStatus,
      note: row.note,
      at: row.createdAt.toISOString(),
      actorName: row.changedByUserId ? (actorName.get(row.changedByUserId) ?? null) : null,
    })),
    workEntries: ticket.workEntries.map((row) => ({
      id: row.id,
      body: row.body,
      visibleToResident: row.visibleToResident,
      at: row.createdAt.toISOString(),
      actorName: row.createdByUserId ? (actorName.get(row.createdByUserId) ?? null) : null,
    })),
  };
}

export interface CreateTicketInput {
  organizationId: string;
  /**
   * Signed-in operator who recorded the ticket. Pass `null` when the
   * ticket comes from the resident portal — residents are not `User` rows
   * so we can't stamp them as the audit actor (and `reportedByPersonId`
   * carries the resident identity instead).
   */
  actorUserId: string | null;
  buildingId: string;
  unitId?: string | null;
  title: string;
  description?: string | null;
  category?: MaintenanceCategory;
  priority?: MaintenancePriority;
  reportedByPersonId?: string | null;
  assignedToUserId?: string | null;
  supplierId?: string | null;
  estimatedCost?: string | number | null;
}

export async function createMaintenanceTicket(input: CreateTicketInput) {
  await assertBuildingBelongsToOrg(input.organizationId, input.buildingId);

  // Internal code: BLD-00001 per organization (short, operator-friendly).
  const code = await nextTicketCode(input.organizationId);

  const ticket = await prisma.$transaction(async (tx) => {
    const row = await tx.maintenanceTicket.create({
      data: {
        organizationId: input.organizationId,
        buildingId: input.buildingId,
        unitId: input.unitId ?? null,
        code,
        title: input.title.trim(),
        description: input.description?.trim() || null,
        category: input.category ?? "OTHER",
        priority: input.priority ?? "NORMAL",
        status: "OPEN",
        reportedByPersonId: input.reportedByPersonId ?? null,
        // reportedByUserId is for a manager-side employee. A portal
        // submission has only reportedByPersonId set, so this stays null.
        reportedByUserId: input.actorUserId,
        assignedToUserId: input.assignedToUserId ?? null,
        supplierId: input.supplierId ?? null,
        estimatedCost:
          input.estimatedCost != null ? new Decimal(input.estimatedCost).toFixed(2) : null,
      },
    });
    await tx.maintenanceTicketHistory.create({
      data: {
        ticketId: row.id,
        toStatus: "OPEN",
        changedByUserId: input.actorUserId,
        note: "Prijava kvara otvorena.",
      },
    });
    return row;
  });

  await recordAudit({
    action: "manager.ticket_created",
    entityType: "MaintenanceTicket",
    entityId: ticket.id,
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    newValues: {
      code: ticket.code,
      title: ticket.title,
      priority: ticket.priority,
      reportedByPersonId: ticket.reportedByPersonId,
    },
  });

  const actionUrl = `/zgrade/kvarovi/${ticket.id}`;

  // Notify the assignee if one was picked up-front.
  if (ticket.assignedToUserId) {
    await notify({
      userId: ticket.assignedToUserId,
      organizationId: input.organizationId,
      category: "TICKET",
      title: `Nova prijava: ${ticket.title}`,
      message: `Dodeljen vam je kvar ${ticket.code}.`,
      entityType: "MaintenanceTicket",
      entityId: ticket.id,
      actionUrl,
    });
  }

  // Resident-reported tickets must reach whoever can act on them. We fan
  // out an in-app notification + email to every org member that currently
  // holds `ticket.manage` (owners, admins, technicians, or whatever custom
  // role an override granted). Email is best-effort; failures only log.
  if (input.reportedByPersonId && !input.actorUserId) {
    try {
      const members = await listOrgMembersWithPermission(input.organizationId, "ticket.manage");
      // Skip the already-notified assignee to avoid duplicate inbox pings.
      const recipients = members.filter((m) => m.userId !== ticket.assignedToUserId);
      if (recipients.length > 0) {
        const building = await prisma.managedBuilding.findUnique({
          where: { id: ticket.buildingId },
          select: { name: true },
        });
        const unit = ticket.unitId
          ? await prisma.managedUnit.findUnique({
              where: { id: ticket.unitId },
              select: { code: true },
            })
          : null;
        const title = `Nova prijava kvara: ${ticket.title}`;
        const message = `Stanar je prijavio kvar ${ticket.code} u zgradi ${
          building?.name ?? ""
        }${unit ? ` (${unit.code})` : ""}.`;
        const origin = appOrigin();
        await notifyMany(
          recipients.map((r) => r.userId),
          {
            organizationId: input.organizationId,
            category: "TICKET",
            title,
            message,
            entityType: "MaintenanceTicket",
            entityId: ticket.id,
            actionUrl,
          },
        );
        for (const recipient of recipients) {
          try {
            // eslint-disable-next-line no-await-in-loop
            await sendEmail({
              to: recipient.email,
              subject: `[${building?.name ?? "Zgrada"}] ${title}`,
              text:
                `${message}\n\n` +
                `Opis: ${ticket.description ?? "(bez dodatnog opisa)"}\n\n` +
                `Detalji: ${origin}${actionUrl}`,
            });
          } catch (err) {
            logger.warn("manager.ticket.resident_report_email_failed", {
              ticketId: ticket.id,
              userId: recipient.userId,
              error: (err as Error)?.message,
            });
          }
        }
      }
    } catch (err) {
      logger.error("manager.ticket.resident_report_notify_failed", {
        ticketId: ticket.id,
        error: (err as Error)?.message,
      });
    }
  }

  await publishTicketBoardNotice(ticket, "opened", input.actorUserId);
  return ticket;
}

export interface UpdateTicketInput {
  organizationId: string;
  actorUserId: string;
  ticketId: string;
  patch: Partial<{
    title: string;
    description: string | null;
    category: MaintenanceCategory;
    priority: MaintenancePriority;
    assignedToUserId: string | null;
    supplierId: string | null;
    estimatedCost: string | number | null;
    actualCost: string | number | null;
    fund: BuildingExpenseFund | null;
  }>;
}

export async function updateMaintenanceTicket(input: UpdateTicketInput) {
  const existing = await prisma.maintenanceTicket.findFirst({
    where: { id: input.ticketId, organizationId: input.organizationId },
  });
  if (!existing) throw DomainErrors.notFound("Prijava nije pronađena.");

  const data: Prisma.MaintenanceTicketUpdateInput = {};
  if (input.patch.title !== undefined) data.title = input.patch.title.trim();
  if (input.patch.description !== undefined)
    data.description = input.patch.description?.trim() || null;
  if (input.patch.category !== undefined) data.category = input.patch.category;
  if (input.patch.priority !== undefined) data.priority = input.patch.priority;
  if (input.patch.assignedToUserId !== undefined)
    data.assignedToUserId = input.patch.assignedToUserId;
  if (input.patch.supplierId !== undefined)
    data.supplier = input.patch.supplierId
      ? { connect: { id: input.patch.supplierId } }
      : { disconnect: true };
  if (input.patch.estimatedCost !== undefined)
    data.estimatedCost =
      input.patch.estimatedCost != null ? new Decimal(input.patch.estimatedCost).toFixed(2) : null;
  if (input.patch.actualCost !== undefined)
    data.actualCost =
      input.patch.actualCost != null ? new Decimal(input.patch.actualCost).toFixed(2) : null;
  if (input.patch.fund !== undefined) data.fund = input.patch.fund ?? null;

  const updated = await prisma.maintenanceTicket.update({
    where: { id: existing.id },
    data,
  });

  await recordAudit({
    action: "manager.ticket_updated",
    entityType: "MaintenanceTicket",
    entityId: updated.id,
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    previousValues: existing,
    newValues: updated,
  });

  return updated;
}

export async function changeMaintenanceStatus(input: {
  organizationId: string;
  actorUserId: string;
  ticketId: string;
  toStatus: MaintenanceStatus;
  note?: string | null;
  actualCost?: string | number | null;
  fund?: BuildingExpenseFund | null;
  supplierId?: string | null;
}) {
  const existing = await prisma.maintenanceTicket.findFirst({
    where: { id: input.ticketId, organizationId: input.organizationId },
    include: { building: { select: { paymentAccountNumber: true, legalName: true, name: true } } },
  });
  if (!existing) throw DomainErrors.notFound("Prijava nije pronađena.");
  if (existing.status === input.toStatus) {
    return existing; // no-op
  }

  const nextIsClosed = input.toStatus === "COMPLETED" || input.toStatus === "CANCELED";

  const updated = await prisma.$transaction(async (tx) => {
    const data: Prisma.MaintenanceTicketUpdateInput = { status: input.toStatus };
    if (nextIsClosed) {
      data.completedAt = new Date();
      data.closedByUserId = input.actorUserId;
    }
    if (input.actualCost != null) {
      data.actualCost = new Decimal(input.actualCost).toFixed(2);
    }
    if (input.fund !== undefined) data.fund = input.fund ?? null;
    if (input.supplierId !== undefined) {
      data.supplier = input.supplierId
        ? { connect: { id: input.supplierId } }
        : { disconnect: true };
    }

    const row = await tx.maintenanceTicket.update({
      where: { id: existing.id },
      data,
    });

    await tx.maintenanceTicketHistory.create({
      data: {
        ticketId: row.id,
        fromStatus: existing.status,
        toStatus: input.toStatus,
        changedByUserId: input.actorUserId,
        note: input.note?.trim() || null,
      },
    });

    // On COMPLETED, roll up to BuildingExpense so finance reports stay fresh.
    if (
      input.toStatus === "COMPLETED" &&
      row.actualCost &&
      new Decimal(row.actualCost.toString()).gt(0)
    ) {
      await tx.buildingExpense.create({
        data: {
          organizationId: input.organizationId,
          buildingId: row.buildingId,
          ticketId: row.id,
          supplierId: row.supplierId ?? null,
          fund: row.fund ?? "CURRENT_MAINTENANCE",
          description: `Kvar ${row.code}: ${row.title}`.slice(0, 500),
          amount: new Decimal(row.actualCost.toString()).toFixed(2),
          currency: row.currency,
          spentAt: new Date(),
          createdByUserId: input.actorUserId,
        },
      });
    }

    return row;
  });

  await recordAudit({
    action:
      input.toStatus === "COMPLETED" || input.toStatus === "CANCELED"
        ? "manager.ticket_closed"
        : "manager.ticket_status_changed",
    entityType: "MaintenanceTicket",
    entityId: updated.id,
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    previousValues: { status: existing.status },
    newValues: { status: updated.status },
    metadata: input.note ? { note: input.note } : undefined,
  });

  const actionUrl = `/zgrade/kvarovi/${updated.id}`;

  // Notify assignee on status change (not on self-change).
  if (updated.assignedToUserId && updated.assignedToUserId !== input.actorUserId) {
    await notify({
      userId: updated.assignedToUserId,
      organizationId: input.organizationId,
      category: "TICKET",
      title: `Status prijave: ${updated.title}`,
      message: `Kvar ${updated.code} je sada u statusu ${statusLabel(updated.status)}.`,
      entityType: "MaintenanceTicket",
      entityId: updated.id,
      actionUrl,
    });
  }

  // Email the resident reporter so they can follow progress without the
  // portal. Best-effort — a missing email or SMTP failure must not block
  // the status change. The portal page `/stanar/kvarovi` always has the
  // authoritative view.
  if (existing.reportedByPersonId) {
    try {
      const reporter = await prisma.buildingPerson.findUnique({
        where: { id: existing.reportedByPersonId },
        select: { email: true, firstName: true, lastName: true },
      });
      const email = reporter?.email?.trim().toLowerCase();
      if (email && /.+@.+\..+/.test(email)) {
        const buildingName = existing.building?.name ?? "zgradi";
        const label = statusLabel(updated.status);
        const subject = `[${buildingName}] Prijava ${updated.code}: ${label}`;
        const greeting = reporter?.firstName ? `Poštovani ${reporter.firstName},` : "Poštovani,";
        const body =
          `${greeting}\n\n` +
          `Status Vaše prijave kvara "${updated.title}" (${updated.code}) ` +
          `je promenjen na: ${label}.\n` +
          (input.note ? `\nNapomena upravnika: ${input.note}\n` : "") +
          `\nStatus možete pratiti i preko stanarskog portala: ${appOrigin()}/stanar/kvarovi/${updated.id}\n` +
          `\nSrdačno,\nUpravnik zgrade`;
        await sendEmail({ to: email, subject, text: body });
      }
    } catch (err) {
      logger.warn("manager.ticket.reporter_status_email_failed", {
        ticketId: updated.id,
        error: (err as Error)?.message,
      });
    }
  }

  if (updated.status === "COMPLETED" || updated.status === "CANCELED") {
    await publishTicketBoardNotice(updated, "closed", input.actorUserId);
  }

  return updated;
}

async function publishTicketBoardNotice(
  ticket: {
    id: string;
    organizationId: string;
    buildingId: string;
    unitId: string | null;
    code: string;
    title: string;
    status: MaintenanceStatus;
  },
  phase: "opened" | "closed",
  actorUserId: string | null,
) {
  const commonArea = !ticket.unitId;
  const label =
    phase === "opened"
      ? "Prijavljen kvar"
      : ticket.status === "CANCELED"
        ? "Prijava je otkazana"
        : "Kvar je završen";
  try {
    await publishLinkedNotice({
      organizationId: ticket.organizationId,
      actorUserId,
      buildingId: ticket.buildingId,
      title: `${label}: ${ticket.title}`,
      body: `${ticket.code}. ${label}.\n\n` + `Detalj: ${appOrigin()}/stanar/kvarovi/${ticket.id}`,
      channel: commonArea ? "PORTAL_AND_EMAIL" : "PORTAL_ONLY",
      audience: commonArea ? "ALL" : "SPECIFIC_UNITS",
      audienceParams: ticket.unitId ? { unitIds: [ticket.unitId] } : {},
      ticketId: ticket.id,
      originKey: `ticket:${ticket.id}:${phase}`,
      publishNow: true,
    });
  } catch (err) {
    logger.warn("manager.ticket.notice_failed", {
      ticketId: ticket.id,
      error: (err as Error)?.message,
    });
  }
}

export async function addMaintenanceWorkEntry(input: {
  organizationId: string;
  actorUserId: string;
  ticketId: string;
  body: string;
  visibleToResident?: boolean;
}) {
  const body = input.body.trim();
  if (body.length < 3) {
    throw DomainErrors.badRequest("Evidencija mora imati bar nekoliko reči.");
  }
  const ticket = await prisma.maintenanceTicket.findFirst({
    where: { id: input.ticketId, organizationId: input.organizationId },
    include: { building: { select: { name: true } } },
  });
  if (!ticket) throw DomainErrors.notFound("Kvar");

  const visible = input.visibleToResident !== false;
  const entry = await prisma.maintenanceWorkEntry.create({
    data: {
      organizationId: input.organizationId,
      ticketId: ticket.id,
      body,
      visibleToResident: visible,
      createdByUserId: input.actorUserId,
    },
  });

  await recordAudit({
    action: "manager.ticket_work_logged",
    entityType: "MaintenanceTicket",
    entityId: ticket.id,
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    newValues: { entryId: entry.id, visibleToResident: visible },
  });

  if (visible && ticket.reportedByPersonId) {
    try {
      const reporter = await prisma.buildingPerson.findUnique({
        where: { id: ticket.reportedByPersonId },
        select: { email: true, firstName: true },
      });
      const email = reporter?.email?.trim().toLowerCase();
      if (email && /.+@.+\..+/.test(email)) {
        const greeting = reporter?.firstName ? `Poštovani ${reporter.firstName},` : "Poštovani,";
        await sendEmail({
          to: email,
          subject: `[${ticket.building.name}] Prijava ${ticket.code}: nova evidencija`,
          text:
            `${greeting}\n\n` +
            `Upravnik je dopunio evidenciju prijave "${ticket.title}" (${ticket.code}):\n\n` +
            `${body}\n\n` +
            `Detalj: ${appOrigin()}/stanar/kvarovi/${ticket.id}\n\n` +
            `Srdačno,\nUpravnik zgrade`,
        });
      }
    } catch (err) {
      logger.warn("manager.ticket.work_entry_email_failed", {
        ticketId: ticket.id,
        error: (err as Error)?.message,
      });
    }
  }

  return entry;
}

function statusLabel(status: MaintenanceStatus): string {
  switch (status) {
    case "OPEN":
      return "Otvoreno";
    case "TRIAGED":
      return "Prihvaćeno";
    case "IN_PROGRESS":
      return "U radu";
    case "AWAITING_PARTS":
      return "Čeka delove";
    case "COMPLETED":
      return "Završeno";
    case "CANCELED":
      return "Otkazano";
    default:
      return status;
  }
}

async function nextTicketCode(organizationId: string): Promise<string> {
  // Count-based auto-increment. Not strictly atomic across concurrent
  // creates, but the ticket code is informational — a retry with a fresh
  // count will produce a unique next value because of the unique index.
  const count = await prisma.maintenanceTicket.count({
    where: { organizationId },
  });
  const next = count + 1;
  return `BLD-${String(next).padStart(5, "0")}`;
}

// ---------------------------------------------------------------------------
// Suppliers
// ---------------------------------------------------------------------------

export async function listSuppliers(input: {
  organizationId: string;
  buildingId?: string | null;
  includeArchived?: boolean;
}) {
  return prisma.supplier.findMany({
    where: {
      organizationId: input.organizationId,
      ...(input.buildingId === undefined
        ? {}
        : input.buildingId === null
          ? { buildingId: null }
          : { OR: [{ buildingId: input.buildingId }, { buildingId: null }] }),
      ...(input.includeArchived ? {} : { archivedAt: null }),
    },
    orderBy: [{ archivedAt: "asc" }, { name: "asc" }],
  });
}

export async function createSupplier(input: {
  organizationId: string;
  actorUserId: string;
  buildingId?: string | null;
  name: string;
  category?: MaintenanceCategory | null;
  contactPerson?: string | null;
  phone?: string | null;
  email?: string | null;
  taxNumber?: string | null;
  notes?: string | null;
}) {
  if (input.buildingId) {
    await assertBuildingBelongsToOrg(input.organizationId, input.buildingId);
  }
  const row = await prisma.supplier.create({
    data: {
      organizationId: input.organizationId,
      buildingId: input.buildingId ?? null,
      name: input.name.trim(),
      category: input.category ?? null,
      contactPerson: input.contactPerson?.trim() || null,
      phone: input.phone?.trim() || null,
      email: input.email?.trim() || null,
      taxNumber: input.taxNumber?.trim() || null,
      notes: input.notes?.trim() || null,
    },
  });

  await recordAudit({
    action: "manager.supplier_created",
    entityType: "Supplier",
    entityId: row.id,
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    newValues: { name: row.name, category: row.category },
  });
  return row;
}

export async function updateSupplier(input: {
  organizationId: string;
  actorUserId: string;
  supplierId: string;
  patch: Partial<{
    name: string;
    category: MaintenanceCategory | null;
    contactPerson: string | null;
    phone: string | null;
    email: string | null;
    taxNumber: string | null;
    notes: string | null;
    archived: boolean;
  }>;
}) {
  const existing = await prisma.supplier.findFirst({
    where: { id: input.supplierId, organizationId: input.organizationId },
  });
  if (!existing) throw DomainErrors.notFound("Izvođač nije pronađen.");

  const data: Prisma.SupplierUpdateInput = {};
  if (input.patch.name !== undefined) data.name = input.patch.name.trim();
  if (input.patch.category !== undefined) data.category = input.patch.category ?? null;
  if (input.patch.contactPerson !== undefined)
    data.contactPerson = input.patch.contactPerson?.trim() || null;
  if (input.patch.phone !== undefined) data.phone = input.patch.phone?.trim() || null;
  if (input.patch.email !== undefined) data.email = input.patch.email?.trim() || null;
  if (input.patch.taxNumber !== undefined) data.taxNumber = input.patch.taxNumber?.trim() || null;
  if (input.patch.notes !== undefined) data.notes = input.patch.notes?.trim() || null;
  if (input.patch.archived !== undefined) {
    data.archivedAt = input.patch.archived ? new Date() : null;
  }

  const updated = await prisma.supplier.update({
    where: { id: existing.id },
    data,
  });

  await recordAudit({
    action: "manager.supplier_updated",
    entityType: "Supplier",
    entityId: updated.id,
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    previousValues: existing,
    newValues: updated,
  });
  return updated;
}

// ---------------------------------------------------------------------------
// Expense reports (per fund)
// ---------------------------------------------------------------------------

export interface FundExpenseSummary {
  fund: BuildingExpenseFund;
  total: string;
  count: number;
}

/**
 * Sum of `BuildingExpense` grouped by fund, optionally scoped to one
 * building and/or one date range. Used by the finance tab and the
 * annual report in Phase 9.
 */
export async function expenseSummaryByFund(input: {
  organizationId: string;
  buildingId?: string;
  from?: Date;
  to?: Date;
}): Promise<FundExpenseSummary[]> {
  const rows = await prisma.buildingExpense.groupBy({
    by: ["fund"],
    where: {
      organizationId: input.organizationId,
      ...(input.buildingId ? { buildingId: input.buildingId } : {}),
      ...(input.from || input.to
        ? {
            spentAt: {
              ...(input.from ? { gte: input.from } : {}),
              ...(input.to ? { lte: input.to } : {}),
            },
          }
        : {}),
    },
    _sum: { amount: true },
    _count: { _all: true },
  });

  return rows.map((r) => ({
    fund: r.fund,
    total: r._sum.amount ? r._sum.amount.toFixed(2) : "0.00",
    count: r._count._all,
  }));
}

export async function createBuildingExpense(input: {
  organizationId: string;
  actorUserId: string;
  buildingId: string;
  fund: BuildingExpenseFund;
  description: string;
  amount: string | number;
  spentAt: Date;
  supplierId?: string | null;
  invoiceDocumentId?: string | null;
}) {
  await assertBuildingBelongsToOrg(input.organizationId, input.buildingId);
  const row = await prisma.buildingExpense.create({
    data: {
      organizationId: input.organizationId,
      buildingId: input.buildingId,
      supplierId: input.supplierId ?? null,
      fund: input.fund,
      description: input.description.trim(),
      amount: new Decimal(input.amount).toFixed(2),
      spentAt: input.spentAt,
      invoiceDocumentId: input.invoiceDocumentId ?? null,
      createdByUserId: input.actorUserId,
    },
  });

  await recordAudit({
    action: "manager.expense_created",
    entityType: "BuildingExpense",
    entityId: row.id,
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    newValues: { fund: row.fund, amount: row.amount.toString() },
  });
  return row;
}
