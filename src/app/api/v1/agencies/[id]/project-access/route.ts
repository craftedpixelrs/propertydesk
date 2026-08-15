import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { requirePermission } from "@/server/permissions/require";
import {
  getConnectionDetail,
  grantProjectAccess,
} from "@/server/services/agencies/agencies.service";

const paramsSchema = z.object({ id: z.string().min(1) });
const bodySchema = z.object({
  projectId: z.string().min(1),
  canViewPrices: z.boolean().optional(),
  canViewFloorPlans: z.boolean().optional(),
  canRequestReservations: z.boolean().optional(),
  showOnlyAgencyVisibleUnits: z.boolean().optional(),
  accessStartsAt: z.string().datetime().optional(),
  accessEndsAt: z.string().datetime().optional(),
});

export const GET = apiHandler({ paramsSchema }, async ({ params }) => {
  const ctx = await requirePermission("agency.read");
  const detail = await getConnectionDetail(ctx.organization.organizationId, params.id);
  return { data: detail.projectAccess };
});

export const POST = apiHandler(
  { paramsSchema, bodySchema },
  async ({ params, body }) => {
    const ctx = await requirePermission("agency.manage");
    const grant = await grantProjectAccess({
      investorOrganizationId: ctx.organization.organizationId,
      actorUserId: ctx.session.user.id,
      connectionId: params.id,
      projectId: body.projectId,
      canViewPrices: body.canViewPrices,
      canViewFloorPlans: body.canViewFloorPlans,
      canRequestReservations: body.canRequestReservations,
      showOnlyAgencyVisibleUnits: body.showOnlyAgencyVisibleUnits,
      accessStartsAt: body.accessStartsAt ? new Date(body.accessStartsAt) : null,
      accessEndsAt: body.accessEndsAt ? new Date(body.accessEndsAt) : null,
    });
    return { data: grant, status: 201 };
  },
);

/**
 * @swagger
 * /api/v1/agencies/{id}/project-access:
 *   get:
 *     tags:
 *       - agencies
 *     summary: List / read agencies
 *     description: |
 *       **Auth:** `requirePermission("agency.read")`
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
 *       - agencies
 *     summary: Create agencies
 *     description: |
 *       **Auth:** `requirePermission("agency.manage") + requirePermission("agency.read")`
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
