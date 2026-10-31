import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { requirePermission } from "@/server/permissions/require";
import { addMaintenanceWorkEntry } from "@/server/services/manager/maintenance.service";

const paramsSchema = z.object({ id: z.string().min(1) });

const bodySchema = z.object({
  body: z.string().trim().min(3).max(4000),
  visibleToResident: z.boolean().optional(),
});

export const POST = apiHandler({ paramsSchema, bodySchema }, async ({ params, body }) => {
  const ctx = await requirePermission("ticket.manage");
  const entry = await addMaintenanceWorkEntry({
    organizationId: ctx.organization.organizationId,
    actorUserId: ctx.session.user.id,
    ticketId: params.id,
    body: body.body,
    visibleToResident: body.visibleToResident,
  });
  return { data: { id: entry.id }, status: 201 };
});

/**
 * @swagger
 * /api/v1/manager/tickets/{id}/entries:
 *   post:
 *     tags: [manager]
 *     summary: Append a work-log entry to a maintenance ticket
 *     description: |
 *       **Auth:** `requirePermission("ticket.manage")`
 *       Visible entries are emailed to the resident who filed the ticket.
 */
