import { z } from "zod";

import { apiHandler } from "@/lib/api/handler";
import { ApiError } from "@/lib/api/errors";
import { requireSuperAdmin } from "@/server/permissions/require";
import { getJob, runJob } from "@/server/jobs";
import "@/server/jobs/definitions";

const paramsSchema = z.object({ name: z.string().min(1) });

/**
 * Manual billing-job trigger. Super-admin only. Bypasses `CRON_SECRET` since
 * the caller is authenticated as a human — but still routes through the same
 * job registry so lock/summary/audit behaviour is identical to the cron run.
 */
export const POST = apiHandler({ paramsSchema }, async ({ params }) => {
  await requireSuperAdmin();
  if (!params.name.startsWith("billing-")) {
    throw new ApiError("BAD_REQUEST", "Ova ruta pokreće samo billing poslove.");
  }
  const job = getJob(params.name);
  if (!job) {
    throw new ApiError("NOT_FOUND", `Nepoznat posao: ${params.name}`);
  }
  const result = await runJob(params.name);
  return { data: { job: params.name, ...result } };
});
