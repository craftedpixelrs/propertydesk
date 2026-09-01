import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { requireSuperAdmin } from "@/server/permissions/require";
import { setAgencyVerification } from "@/server/services/platform.service";

const paramsSchema = z.object({ id: z.string().min(1) });
const bodySchema = z.object({
  status: z.enum(["VERIFIED", "REJECTED", "PENDING"]),
  note: z.string().max(2000).optional().nullable(),
});

export const POST = apiHandler(
  { paramsSchema, bodySchema },
  async ({ params, body }) => {
    const ctx = await requireSuperAdmin();
    const updated = await setAgencyVerification({
      organizationId: params.id,
      actorUserId: ctx.session.user.id,
      status: body.status,
      note: body.note,
    });
    return { data: updated };
  },
);

/**
 * @swagger
 * /api/v1/platform/organizations/{id}/verification:
 *   post:
 *     tags:
 *       - platform
 *     summary: Verifikacija agencije
 *     description: |
 *       **Auth:** `requireSuperAdmin()`
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       "200":
 *         description: OK
 */
