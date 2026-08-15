import { apiHandler } from "@/lib/api/handler";
import { prisma } from "@/server/db/prisma";

/**
 * Readiness probe. Public — no auth required.
 * Verifies that the database is reachable. Used by container orchestrators
 * and monitoring systems.
 */
export const GET = apiHandler({}, async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return {
      data: {
        status: "ready" as const,
        database: "ok" as const,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (err) {
    return {
      data: {
        status: "not_ready" as const,
        database: "error" as const,
        error: (err as Error).message,
        timestamp: new Date().toISOString(),
      },
      status: 503,
    };
  }
});

/**
 * @swagger
 * /api/v1/health/ready:
 *   get:
 *     tags:
 *       - health
 *     summary: Readiness probe
 *     description: |
 *       **Auth:** `javno (bez sesije)`
 *       Javni endpoint — proverava da li app može da služi saobraćaj.
 *     security: []
 *     responses:
 *       "200":
 *         description: Spreman
 *       "503":
 *         description: Zavisnost (npr. baza) nije dostupna
 */
