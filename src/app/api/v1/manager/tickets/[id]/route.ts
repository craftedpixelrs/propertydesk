import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { requirePermission } from "@/server/permissions/require";
import {
  changeMaintenanceStatus,
  getMaintenanceTicket,
  updateMaintenanceTicket,
} from "@/server/services/manager/maintenance.service";

const paramsSchema = z.object({ id: z.string().min(1) });

const PRIORITY = z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]);
const CATEGORY = z.enum([
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
]);
const STATUS = z.enum([
  "OPEN",
  "TRIAGED",
  "IN_PROGRESS",
  "AWAITING_PARTS",
  "COMPLETED",
  "CANCELED",
]);
const FUND = z.enum(["CURRENT_MAINTENANCE", "INVESTMENT_FUND", "OTHER"]);

const patchSchema = z.object({
  title: z.string().trim().min(2).max(200).optional(),
  description: z.string().max(5000).nullable().optional(),
  category: CATEGORY.optional(),
  priority: PRIORITY.optional(),
  assignedToUserId: z.string().min(1).nullable().optional(),
  supplierId: z.string().min(1).nullable().optional(),
  estimatedCost: z.coerce.number().nonnegative().nullable().optional(),
  actualCost: z.coerce.number().nonnegative().nullable().optional(),
  fund: FUND.nullable().optional(),
  status: STATUS.optional(),
  statusNote: z.string().max(2000).nullable().optional(),
});

export const GET = apiHandler({ paramsSchema }, async ({ params }) => {
  const ctx = await requirePermission("ticket.read");
  const ticket = await getMaintenanceTicket(ctx.organization.organizationId, params.id);
  return { data: ticket };
});

export const PATCH = apiHandler(
  { paramsSchema, bodySchema: patchSchema },
  async ({ params, body }) => {
    const ctx = await requirePermission("ticket.manage");
    // Status transitions go through the state-machine helper so we also
    // write a `MaintenanceTicketHistory` row (and roll up expenses).
    const { status, statusNote, actualCost, fund, supplierId, ...rest } = body;
    let ticket = await updateMaintenanceTicket({
      organizationId: ctx.organization.organizationId,
      actorUserId: ctx.session.user.id,
      ticketId: params.id,
      patch: {
        ...rest,
        supplierId: supplierId,
      },
    });
    if (status) {
      ticket = await changeMaintenanceStatus({
        organizationId: ctx.organization.organizationId,
        actorUserId: ctx.session.user.id,
        ticketId: params.id,
        toStatus: status,
        note: statusNote,
        actualCost,
        fund,
        supplierId,
      });
    }
    return { data: ticket };
  },
);

/**
 * @swagger
 * /api/v1/manager/tickets/{id}:
 *   get:
 *     tags: [manager]
 *     summary: Read a ticket with history
 *     description: |
 *       **Auth:** `requirePermission("ticket.read")`
 *   patch:
 *     tags: [manager]
 *     summary: Update a ticket (incl. status transitions)
 *     description: |
 *       **Auth:** `requirePermission("ticket.manage")`
 */
