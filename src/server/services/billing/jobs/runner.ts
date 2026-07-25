import "server-only";
import { Prisma } from "@prisma/client";
import type { BillingJobStatus, BillingJobType } from "@prisma/client";
import { createId } from "@paralleldrive/cuid2";

import { prisma } from "@/server/db/prisma";
import { logger } from "@/server/logger";
import { recordAudit } from "@/server/audit/audit";

/**
 * Cross-cutting execution wrapper for billing jobs.
 *
 * Responsibilities:
 *   - Acquire a unique "RUNNING" row via the `billing_job_run_type_running_unique`
 *     partial index. Concurrent runs of the same job type are rejected with
 *     P2002 which we translate to "already running" and skip cleanly.
 *   - Time the run, capture counts and summary, write terminal row state.
 *   - Emit audit log entry for the run.
 *
 * The core job logic stays framework-agnostic — it just returns a summary.
 */

export interface BillingJobSummary {
  processed?: number;
  succeeded?: number;
  errors?: number;
  skipped?: number;
  detail?: Record<string, unknown>;
}

export interface RunOptions {
  triggeredBy: "cron" | "manual" | "boot";
  triggeredByUserId?: string | null;
}

export async function runBillingJob(
  jobType: BillingJobType,
  work: () => Promise<BillingJobSummary>,
  options: RunOptions,
): Promise<{
  status: BillingJobStatus;
  runId: string | null;
  summary: BillingJobSummary;
  durationMs: number;
  message?: string;
}> {
  const startedAt = new Date();
  let runId: string | null = null;
  try {
    const created = await prisma.billingJobRun.create({
      data: {
        id: createId(),
        jobType,
        status: "RUNNING",
        triggeredBy: options.triggeredBy,
        triggeredByUserId: options.triggeredByUserId ?? null,
        startedAt,
      },
    });
    runId = created.id;
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      // Another run is in progress — skip.
      logger.warn("billing.job_already_running", { jobType });
      return {
        status: "CANCELED",
        runId: null,
        summary: {},
        durationMs: 0,
        message: "Već postoji aktivan job iste vrste.",
      };
    }
    throw err;
  }

  try {
    const summary = await work();
    const durationMs = Date.now() - startedAt.getTime();
    const status: BillingJobStatus =
      (summary.errors ?? 0) > 0 ? "COMPLETED_WITH_ERRORS" : "COMPLETED";
    await prisma.billingJobRun.update({
      where: { id: runId },
      data: {
        status,
        finishedAt: new Date(),
        durationMs,
        processedCount: summary.processed ?? 0,
        successCount: summary.succeeded ?? 0,
        errorCount: summary.errors ?? 0,
        skippedCount: summary.skipped ?? 0,
        summary: (summary.detail ?? summary) as unknown as Prisma.InputJsonValue,
      },
    });
    await recordAudit({
      action: "billing.job_run",
      entityType: "BillingJobRun",
      entityId: runId,
      actorUserId: options.triggeredByUserId ?? null,
      metadata: {
        jobType,
        status,
        durationMs,
        processed: summary.processed ?? 0,
        errors: summary.errors ?? 0,
      },
    });
    return { status, runId, summary, durationMs };
  } catch (err) {
    const durationMs = Date.now() - startedAt.getTime();
    await prisma.billingJobRun.update({
      where: { id: runId },
      data: {
        status: "FAILED",
        finishedAt: new Date(),
        durationMs,
        errorMessage: (err as Error)?.message ?? String(err),
      },
    });
    logger.error("billing.job_failed", {
      jobType,
      error: (err as Error)?.message,
      runId,
    });
    throw err;
  }
}
