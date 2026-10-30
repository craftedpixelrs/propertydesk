import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { paginate } from "@/lib/api/query";
import { requirePermission } from "@/server/permissions/require";
import {
  createMaintenanceTicket,
  listMaintenanceTickets,
} from "@/server/services/manager/maintenance.service";

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
const PRIORITY = z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]);
const STATUS = z.enum([
  "OPEN",
  "TRIAGED",
  "IN_PROGRESS",
  "AWAITING_PARTS",
  "COMPLETED",
  "CANCELED",
]);

const createSchema = z.object({
  buildingId: z.string().min(1),
  unitId: z.string().min(1).nullable().optional(),
  title: z.string().trim().min(2).max(200),
  description: z.string().max(5000).nullable().optional(),
  category: CATEGORY.optional(),
  priority: PRIORITY.optional(),
  reportedByPersonId: z.string().min(1).nullable().optional(),
  assignedToUserId: z.string().min(1).nullable().optional(),
  supplierId: z.string().min(1).nullable().optional(),
  estimatedCost: z.coerce.number().nonnegative().nullable().optional(),
});

export const GET = apiHandler({}, async ({ query, searchParams }) => {
  const ctx = await requirePermission("ticket.read");
  const buildingId = query.filters.building ?? searchParams.get("building") ?? undefined;
  const statusRaw = query.filters.status ?? searchParams.get("status");
  const status = statusRaw ? STATUS.parse(statusRaw) : undefined;
  const priorityRaw = query.filters.priority ?? searchParams.get("priority");
  const priority = priorityRaw ? PRIORITY.parse(priorityRaw) : undefined;
  const { items, total } = await listMaintenanceTickets({
    organizationId: ctx.organization.organizationId,
    buildingId: buildingId ?? undefined,
    status,
    priority,
    page: query.page,
    pageSize: query.pageSize,
  });
  const { items: pageItems, pagination } = paginate(items, query.page, query.pageSize, total);
  return { data: pageItems, meta: { pagination } };
});

export const POST = apiHandler({ bodySchema: createSchema }, async ({ body }) => {
  const ctx = await requirePermission("ticket.manage");
  const ticket = await createMaintenanceTicket({
    organizationId: ctx.organization.organizationId,
    actorUserId: ctx.session.user.id,
    ...body,
  });
  return { data: ticket, status: 201 };
});

/**
 * @swagger
 * /api/v1/manager/tickets:
 *   get:
 *     tags: [manager]
 *     summary: List maintenance tickets
 *     description: |
 *       **Auth:** `requirePermission("ticket.read")`
 *   post:
 *     tags: [manager]
 *     summary: Create a maintenance ticket
 *     description: |
 *       **Auth:** `requirePermission("ticket.manage")`
 */
