import { serverEnv } from "@/lib/env";
import { logger } from "@/server/logger";

/**
 * Scheduled job registry.
 *
 * The app is a plain Next.js server; scheduled work is run by an external
 * cron trigger that hits `/api/v1/jobs/{name}` with a shared secret. Each
 * job registered here has:
 *   - a stable name (matches the URL slug)
 *   - a Serbian description (surfaced in the platform admin UI later)
 *   - a runner function
 *
 * See docs/jobs.md for the recommended crontab entries.
 */

export type JobRunner = () => Promise<JobRunResult>;

export interface JobRunResult {
  processed?: number;
  updated?: number;
  skipped?: number;
  errors?: number;
  details?: Record<string, unknown>;
}

export interface JobDefinition {
  name: string;
  description: string;
  suggestedCron: string;
  run: JobRunner;
}

const registry = new Map<string, JobDefinition>();

export function registerJob(def: JobDefinition): void {
  if (registry.has(def.name)) {
    throw new Error(`Job already registered: ${def.name}`);
  }
  registry.set(def.name, def);
}

export function listJobs(): JobDefinition[] {
  return Array.from(registry.values());
}

export function getJob(name: string): JobDefinition | undefined {
  return registry.get(name);
}

/**
 * Runs a job and logs a structured summary. Meant to be called by the
 * `/api/v1/jobs/{name}` handler after verifying `CRON_SECRET`.
 */
export async function runJob(name: string): Promise<JobRunResult> {
  const job = registry.get(name);
  if (!job) {
    throw new Error(`Unknown job: ${name}`);
  }

  const started = Date.now();
  logger.info("job.start", { action: name });

  try {
    const result = await job.run();
    logger.info("job.done", {
      action: name,
      durationMs: Date.now() - started,
      ...result,
    });
    return result;
  } catch (err) {
    logger.error("job.failed", {
      action: name,
      durationMs: Date.now() - started,
      error: (err as Error)?.message,
    });
    throw err;
  }
}

/**
 * Guard used by /api/v1/jobs/... routes. Verifies the shared cron secret.
 * If `CRON_SECRET` is unset, the endpoint is disabled entirely (safer default).
 */
export function verifyCronSecret(providedHeader: string | null | undefined): boolean {
  const secret = serverEnv.CRON_SECRET;
  if (!secret) return false;
  if (!providedHeader) return false;
  const provided = providedHeader.replace(/^Bearer\s+/i, "").trim();
  if (provided.length !== secret.length) return false;
  let mismatch = 0;
  for (let i = 0; i < secret.length; i++) {
    mismatch |= secret.charCodeAt(i) ^ provided.charCodeAt(i);
  }
  return mismatch === 0;
}
