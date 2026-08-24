import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { requireSession } from "@/server/auth/session";
import { requestOwnEmailChange } from "@/server/services/account.service";

const bodySchema = z.object({
  email: z.string().email().max(160),
});

export const POST = apiHandler({ bodySchema }, async ({ body }) => {
  const session = await requireSession();
  const result = await requestOwnEmailChange({
    session,
    newEmail: body.email,
  });
  return { data: result };
});

/**
 * @swagger
 * /api/v1/me/email:
 *   post:
 *     tags:
 *       - me
 *     summary: Request own email change
 *     description: |
 *       **Auth:** sesija. Šalje potvrdu na trenutnu adresu. Nije dozvoljeno tokom impersonacije.
 *     responses:
 *       "200":
 *         description: OK
 *       "401":
 *         $ref: "#/components/responses/Unauthenticated"
 *       "403":
 *         $ref: "#/components/responses/Forbidden"
 */
