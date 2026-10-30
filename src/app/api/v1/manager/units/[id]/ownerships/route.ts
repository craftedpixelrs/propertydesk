import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { DomainErrors } from "@/lib/errors";
import { requirePermission } from "@/server/permissions/require";
import { assignOwnership, endOwnership } from "@/server/services/manager/buildings.service";

const paramsSchema = z.object({ id: z.string().min(1) });

const createSchema = z.object({
  personId: z.string().min(1),
  role: z.enum(["OWNER", "TENANT", "USER"]).optional(),
  sharePercent: z.number().min(0).max(100).optional(),
  isPrimary: z.boolean().optional(),
  startedAt: z.coerce.date().optional(),
});

export const POST = apiHandler(
  { paramsSchema, bodySchema: createSchema },
  async ({ params, body }) => {
    const ctx = await requirePermission("building.manage");
    const row = await assignOwnership({
      organizationId: ctx.organization.organizationId,
      actorUserId: ctx.session.user.id,
      unitId: params.id,
      ...body,
    });
    return { data: row, status: 201 };
  },
);

export const DELETE = apiHandler({ paramsSchema }, async ({ searchParams }) => {
  const ctx = await requirePermission("building.manage");
  const ownershipId = searchParams.get("ownershipId");
  if (!ownershipId) {
    throw DomainErrors.badRequest("ownershipId query parameter is required");
  }
  const endedAtRaw = searchParams.get("endedAt");
  const endedAt = endedAtRaw ? new Date(endedAtRaw) : undefined;
  const row = await endOwnership({
    organizationId: ctx.organization.organizationId,
    actorUserId: ctx.session.user.id,
    ownershipId,
    endedAt,
  });
  return { data: row };
});

/**
 * @swagger
 * /api/v1/manager/units/{id}/ownerships:
 *   post:
 *     tags: [manager]
 *     summary: Assign a person to a managed unit (owner/tenant/user)
 *     description: |
 *       **Auth:** `requirePermission("building.manage")`
 *   delete:
 *     tags: [manager]
 *     summary: End an existing ownership relation
 *     description: |
 *       **Auth:** `requirePermission("building.manage")`
 */
