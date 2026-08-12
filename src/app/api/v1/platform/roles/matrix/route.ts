import { apiHandler } from "@/lib/api/handler";
import { requireSuperAdmin } from "@/server/permissions/require";
import { getRoleMatrix } from "@/server/services/permissions/role-overrides.service";

/**
 * GET /api/v1/platform/roles/matrix
 *
 * Returns the full permissions × roles grid — every cell carries the
 * compile-time `default`, the current `effective` value (after any
 * override), and a `hasOverride` boolean. Used by the admin UI at
 * `/administracija/role`.
 */
export const GET = apiHandler({}, async () => {
  await requireSuperAdmin();
  const matrix = await getRoleMatrix();
  return { data: matrix };
});

/**
 * @swagger
 * /api/v1/platform/roles/matrix:
 *   get:
 *     tags:
 *       - platform
 *     summary: List / read platform
 *     responses:
 *       "200":
 *         description: OK
 *       "401":
 *         $ref: "#/components/responses/Unauthenticated"
 *       "403":
 *         $ref: "#/components/responses/Forbidden"
 */
