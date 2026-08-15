import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { ApiError } from "@/lib/api/errors";
import { getJob, runJob, verifyCronSecret } from "@/server/jobs";
import "@/server/jobs/definitions";

const paramsSchema = z.object({ name: z.string().min(1) });

/**
 * Scheduled job dispatcher.
 *
 * Called by an external cron trigger with the shared `CRON_SECRET` in either
 * the `Authorization: Bearer <secret>` header or `x-cron-secret`. Never
 * authenticated as a user — this is machine-to-machine only.
 */
export const POST = apiHandler({ paramsSchema }, async ({ req, params }) => {
  const provided =
    req.headers.get("authorization") ?? req.headers.get("x-cron-secret");
  if (!verifyCronSecret(provided)) {
    throw new ApiError("UNAUTHENTICATED", "Neispravan ili nedostajući cron token.", {
      statusCode: 401,
    });
  }

  const job = getJob(params.name);
  if (!job) {
    throw new ApiError("NOT_FOUND", `Nepoznat posao: ${params.name}`, {
      statusCode: 404,
    });
  }

  const result = await runJob(params.name);
  return { data: { job: params.name, ...result } };
});

/**
 * @swagger
 * /api/v1/jobs/{name}:
 *   post:
 *     tags:
 *       - jobs
 *     summary: Create jobs
 *     description: |
 *       **Auth:** `CRON_SECRET (Authorization: Bearer ili x-cron-secret)`
 *     parameters:
 *       - in: path
 *         name: name
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
