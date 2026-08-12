import { apiHandler } from "@/lib/api/handler";

/**
 * Liveness / readiness probe. Public — no auth required.
 * Also used by the E2E smoke test to verify that the app boots.
 */
export const GET = apiHandler({}, async () => {
  return {
    data: {
      status: "ok" as const,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version ?? "0.1.0",
    },
  };
});

/**
 * @swagger
 * /api/v1/health:
 *   get:
 *     tags:
 *       - health
 *     summary: List / read health
 *     responses:
 *       "200":
 *         description: OK
 *       "401":
 *         $ref: "#/components/responses/Unauthenticated"
 *       "403":
 *         $ref: "#/components/responses/Forbidden"
 */
