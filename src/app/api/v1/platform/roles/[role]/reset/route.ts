import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { DomainErrors } from "@/lib/errors";
import { requireSuperAdmin } from "@/server/permissions/require";
import {
  resetRoleToDefaults,
  ALL_ROLE_NAMES,
} from "@/server/services/permissions/role-overrides.service";

const paramsSchema = z.object({ role: z.string().min(1) });

/**
 * POST /api/v1/platform/roles/{role}/reset
 *
 * Delete every override for the given role so the compile-time defaults
 * from `roles.ts` apply again on the next request.
 */
export const POST = apiHandler({ paramsSchema }, async ({ params }) => {
  const ctx = await requireSuperAdmin();
  if (!(ALL_ROLE_NAMES as string[]).includes(params.role)) {
    throw DomainErrors.badRequest(`Nepoznata rola: ${params.role}`);
  }
  const result = await resetRoleToDefaults(params.role, ctx.session.user.id);
  return { data: result };
});

/**
 * @swagger
 * /api/v1/platform/roles/{role}/reset:
 *   post:
 *     tags:
 *       - platform
 *     summary: Create platform
 *     description: |
 *       **Auth:** `requireSuperAdmin() — platform SUPER_ADMIN`
 *     parameters:
 *       - in: path
 *         name: role
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
