import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { requireSession } from "@/server/auth/session";
import { changeOwnPassword } from "@/server/services/account.service";

const bodySchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: z.string().min(10).max(128),
});

export const POST = apiHandler({ bodySchema }, async ({ body }) => {
  const session = await requireSession();
  await changeOwnPassword({
    session,
    currentPassword: body.currentPassword,
    newPassword: body.newPassword,
  });
  return { data: { ok: true } };
});

/**
 * @swagger
 * /api/v1/me/password:
 *   post:
 *     tags:
 *       - me
 *     summary: Change own password
 *     description: |
 *       **Auth:** sesija. Nije dozvoljeno tokom impersonacije.
 *     responses:
 *       "200":
 *         description: OK
 *       "401":
 *         $ref: "#/components/responses/Unauthenticated"
 *       "403":
 *         $ref: "#/components/responses/Forbidden"
 */
