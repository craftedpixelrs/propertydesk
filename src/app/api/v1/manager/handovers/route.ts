import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { requirePermission } from "@/server/permissions/require";
import { createHandoverRequest } from "@/server/services/manager/handover.service";

const bodySchema = z.object({
  projectId: z.string().min(1),
  targetContactEmail: z.string().email(),
  targetContactName: z.string().optional().nullable(),
  targetOrganizationId: z.string().min(1).optional().nullable(),
  targetTaxNumber: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const POST = apiHandler({ bodySchema }, async ({ body }) => {
  // Only investor roles with project.handover_manager can request.
  const ctx = await requirePermission("project.handover_manager");
  const row = await createHandoverRequest({
    sourceOrganizationId: ctx.organization.organizationId,
    actorUserId: ctx.session.user.id,
    sourceProjectId: body.projectId,
    targetOrganizationId: body.targetOrganizationId ?? null,
    targetContactEmail: body.targetContactEmail,
    targetContactName: body.targetContactName ?? null,
    targetTaxNumber: body.targetTaxNumber ?? null,
    notes: body.notes ?? null,
  });
  return { data: row, status: 201 };
});

/**
 * @swagger
 * /api/v1/manager/handovers:
 *   post:
 *     tags: [manager]
 *     summary: Investor-side — request handover of a project to a manager
 *     description: |
 *       **Auth:** `requirePermission("project.handover_manager")` (INVESTOR org)
 *       The target MANAGER organization may be unknown at request time —
 *       `targetContactEmail` is the common denominator.
 */
