import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { requirePermission } from "@/server/permissions/require";
import {
  getKycStatus,
  updateKycChecklist,
} from "@/server/services/buyers/kyc.service";

const paramsSchema = z.object({ id: z.string().min(1).max(64) });
const patchSchema = z.object({
  idFrontOk: z.boolean().optional(),
  idBackOk: z.boolean().optional(),
  addressProofOk: z.boolean().optional(),
  taxCertOk: z.boolean().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

export const GET = apiHandler({ paramsSchema }, async ({ params }) => {
  const ctx = await requirePermission("lead.read");
  const status = await getKycStatus({
    organizationId: ctx.organization.organizationId,
    buyerId: params.id,
  });
  return { data: status };
});

export const PATCH = apiHandler(
  { paramsSchema, bodySchema: patchSchema },
  async ({ params, body }) => {
    const ctx = await requirePermission("lead.manage");
    const status = await updateKycChecklist({
      organizationId: ctx.organization.organizationId,
      actorUserId: ctx.session.user.id,
      buyerId: params.id,
      ...body,
    });
    return { data: status };
  },
);

/**
 * @swagger
 * /api/v1/buyers/{id}/kyc:
 *   get:
 *     tags:
 *       - buyers
 *     summary: List / read buyers
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       "200":
 *         description: OK
 *       "401":
 *         $ref: "#/components/responses/Unauthenticated"
 *       "403":
 *         $ref: "#/components/responses/Forbidden"
 *   patch:
 *     tags:
 *       - buyers
 *     summary: Update buyers
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
 *         description: OK
 *       "401":
 *         $ref: "#/components/responses/Unauthenticated"
 *       "403":
 *         $ref: "#/components/responses/Forbidden"
 */
