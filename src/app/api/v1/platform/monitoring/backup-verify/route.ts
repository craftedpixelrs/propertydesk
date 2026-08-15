import { apiHandler } from "@/lib/api/handler";
import { requireSuperAdmin } from "@/server/permissions/require";
import { runBackupVerify } from "@/server/services/monitoring/backup-verify.service";

/**
 * Manual trigger for the `backup-verify` job. Only SUPER_ADMIN users can
 * hit this endpoint (the scheduled cron endpoint uses `CRON_SECRET`
 * instead). The response mirrors the shape produced by
 * `POST /api/v1/jobs/backup-verify`.
 */
export const POST = apiHandler({}, async () => {
  await requireSuperAdmin();
  const { outcome, check } = await runBackupVerify();
  return {
    data: {
      status: outcome.status,
      message: outcome.message,
      fileName: outcome.fileName,
      fileSize: outcome.fileSize,
      recordId: check?.id ?? null,
      runAt: check?.runAt.toISOString() ?? new Date().toISOString(),
    },
  };
});

/**
 * @swagger
 * /api/v1/platform/monitoring/backup-verify:
 *   post:
 *     tags:
 *       - platform
 *     summary: Create platform
 *     description: |
 *       **Auth:** `requireSuperAdmin() — platform SUPER_ADMIN`
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
