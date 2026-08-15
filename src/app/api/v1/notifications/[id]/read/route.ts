import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { requireSession } from "@/server/auth/session";
import { markNotificationRead } from "@/server/services/notifications.service";

const paramsSchema = z.object({ id: z.string().min(1) });

export const POST = apiHandler({ paramsSchema }, async ({ params }) => {
  const session = await requireSession();
  await markNotificationRead(session.user.id, params.id);
  return { data: { ok: true } };
});

/**
 * @swagger
 * /api/v1/notifications/{id}/read:
 *   post:
 *     tags:
 *       - notifications
 *     summary: Create notifications
 *     description: |
 *       **Auth:** `sesija (ulogovan + aktivna org) — bez posebne permission`
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
