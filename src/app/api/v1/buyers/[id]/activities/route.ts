import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { paginate } from "@/lib/api/query";
import { requirePermission } from "@/server/permissions/require";
import {
  assertBuyerInOrg,
  listActivities,
  recordActivity,
} from "@/server/services/activities.service";

const paramsSchema = z.object({ id: z.string().min(1) });

const ACTIVITY_TYPES = [
  "NOTE",
  "CALL",
  "EMAIL",
  "MEETING",
  "VIEWING",
  "OFFER",
  "STATUS_CHANGE",
  "SYSTEM",
] as const;

const createSchema = z.object({
  type: z.enum(ACTIVITY_TYPES),
  description: z.string().min(1).max(2000),
  occurredAt: z.string().datetime().optional(),
});

export const GET = apiHandler({ paramsSchema }, async ({ params, query }) => {
  const ctx = await requirePermission("lead.read");
  await assertBuyerInOrg(ctx.organization.organizationId, params.id);
  const { items, total } = await listActivities({
    organizationId: ctx.organization.organizationId,
    page: query.page,
    pageSize: query.pageSize,
    buyerId: params.id,
  });
  const { items: pageItems, pagination } = paginate(items, query.page, query.pageSize, total);
  return { data: pageItems, meta: { pagination } };
});

export const POST = apiHandler({ paramsSchema, bodySchema: createSchema }, async ({ params, body }) => {
  const ctx = await requirePermission("lead.manage");
  await assertBuyerInOrg(ctx.organization.organizationId, params.id);
  const activity = await recordActivity({
    organizationId: ctx.organization.organizationId,
    actorUserId: ctx.session.user.id,
    type: body.type,
    description: body.description,
    buyerId: params.id,
    occurredAt: body.occurredAt ? new Date(body.occurredAt) : undefined,
  });
  return { data: activity, status: 201 };
});

/**
 * @swagger
 * /api/v1/buyers/{id}/activities:
 *   get:
 *     tags:
 *       - buyers
 *     summary: List / read buyers
 *     description: |
 *       **Auth:** `requirePermission("lead.read")`
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       "200":
 *         description: |
 *           OK
 *       "401":
 *         $ref: "#/components/responses/Unauthenticated"
 *       "403":
 *         $ref: "#/components/responses/Forbidden"
 *   post:
 *     tags:
 *       - buyers
 *     summary: Create buyers
 *     description: |
 *       **Auth:** `requirePermission("lead.manage") + requirePermission("lead.read")`
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             additionalProperties: true
 *     responses:
 *       "200":
 *         description: |
 *           OK
 *       "401":
 *         $ref: "#/components/responses/Unauthenticated"
 *       "403":
 *         $ref: "#/components/responses/Forbidden"
 */
