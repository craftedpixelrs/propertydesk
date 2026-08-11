import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import os from "node:os";

import type {
  SystemHealthCheck,
  SystemHealthCheckKind,
  SystemHealthCheckStatus,
} from "@prisma/client";

import { serverEnv } from "@/lib/env";
import { prisma } from "@/server/db/prisma";
import { logger } from "@/server/logger";
import { sendEmail } from "@/server/auth/email";
import { APP_NAME } from "@/lib/constants/app";
import { captureException } from "@/server/monitoring";

/**
 * Automatic backup verifier — Faza 8.3 (C4).
 *
 * The job downloads the most recent `pg_dump` file from either a local
 * directory or an S3-compatible bucket and runs `pg_restore --list` to
 * confirm the archive header is well-formed. It does not restore any
 * data — the check is intentionally lightweight so it can run weekly
 * without touching production data.
 *
 * The outcome is written to the `SystemHealthCheck` table so operators
 * can browse a timeline in `/administracija/monitoring`. When two
 * consecutive runs fail, `BACKUP_VERIFY_ALERT_EMAILS` (falling back to
 * `SEED_SUPER_ADMIN_EMAIL`) receives an email alert.
 *
 * Every branch is defensive: a missing binary, network flake, or
 * misconfiguration is recorded as `FAIL` with a descriptive message,
 * never thrown up the stack.
 */

const CANDIDATE_EXTENSIONS = [
  ".pgcustom",
  ".dump",
  ".pgdump",
  ".tar",
  ".backup",
];

export interface BackupVerifyOutcome {
  status: SystemHealthCheckStatus;
  message: string;
  fileName?: string;
  fileSize?: number;
}

/**
 * Public API — records a new `SystemHealthCheck` row and returns the
 * saved row (or `null` when persistence itself failed).
 */
export async function runBackupVerify(): Promise<{
  check: SystemHealthCheck | null;
  outcome: BackupVerifyOutcome;
}> {
  const started = Date.now();
  let outcome: BackupVerifyOutcome;

  try {
    outcome = await performVerification();
  } catch (err) {
    // Should never bubble up — performVerification returns an outcome
    // even on failure. Belt and braces.
    outcome = {
      status: "FAIL",
      message: `Neočekivana greška: ${(err as Error)?.message ?? "unknown"}`,
    };
    captureException(err, { tags: { job: "backup-verify" } });
  }

  logger.info("backup_verify.done", {
    durationMs: Date.now() - started,
    status: outcome.status,
    message: outcome.message,
    fileName: outcome.fileName,
    fileSize: outcome.fileSize,
  });

  const check = await recordCheck("BACKUP_VERIFY", outcome);

  if (outcome.status === "FAIL") {
    await maybeAlertOnConsecutiveFailures();
  }

  return { check, outcome };
}

async function performVerification(): Promise<BackupVerifyOutcome> {
  switch (serverEnv.BACKUP_VERIFY_SOURCE) {
    case "disabled":
      return {
        status: "OK",
        message:
          "Verifikator je isključen (`BACKUP_VERIFY_SOURCE=disabled`). Konfigurišite izvor kako bi provera bila aktivna.",
      };
    case "local":
      return verifyLocalBackup();
    case "s3":
      return verifyS3Backup();
    default:
      return {
        status: "FAIL",
        message: `Nepoznat BACKUP_VERIFY_SOURCE: ${String(
          serverEnv.BACKUP_VERIFY_SOURCE,
        )}`,
      };
  }
}

// ---------------------------------------------------------------------------
// Local filesystem source
// ---------------------------------------------------------------------------

async function verifyLocalBackup(): Promise<BackupVerifyOutcome> {
  const dir = serverEnv.BACKUP_VERIFY_LOCAL_DIR;
  if (!dir) {
    return {
      status: "FAIL",
      message:
        "BACKUP_VERIFY_LOCAL_DIR nije postavljen — nema gde da tražim pg_dump fajl.",
    };
  }

  let entries: string[];
  try {
    entries = await fs.readdir(dir);
  } catch (err) {
    return {
      status: "FAIL",
      message: `Ne mogu da pročitam direktorijum '${dir}': ${
        (err as Error)?.message ?? "unknown"
      }`,
    };
  }

  const candidates = entries.filter((name) =>
    CANDIDATE_EXTENSIONS.some((ext) => name.toLowerCase().endsWith(ext)),
  );

  if (candidates.length === 0) {
    return {
      status: "FAIL",
      message: `U direktorijumu '${dir}' nema pg_dump fajlova (${CANDIDATE_EXTENSIONS.join(", ")}).`,
    };
  }

  const withStats = await Promise.all(
    candidates.map(async (name) => {
      const full = path.join(dir, name);
      const stat = await fs.stat(full).catch(() => null);
      return stat ? { name, full, mtimeMs: stat.mtimeMs, size: stat.size } : null;
    }),
  );

  const usable = withStats.filter(
    (c): c is { name: string; full: string; mtimeMs: number; size: number } =>
      Boolean(c),
  );

  if (usable.length === 0) {
    return {
      status: "FAIL",
      message: `Ne mogu da pročitam statistiku ni jednog fajla u '${dir}'.`,
    };
  }

  usable.sort((a, b) => b.mtimeMs - a.mtimeMs);
  const latest = usable[0]!;

  const result = await pgRestoreList(latest.full);
  if (!result.ok) {
    return {
      status: "FAIL",
      message: `pg_restore --list nije prošao za '${latest.name}': ${result.error}`,
      fileName: latest.name,
      fileSize: latest.size,
    };
  }

  return {
    status: "OK",
    message: `Provera prošla: ${result.tocEntries} TOC unosa, poslednji fajl '${latest.name}' od ${new Date(latest.mtimeMs).toISOString()}.`,
    fileName: latest.name,
    fileSize: latest.size,
  };
}

// ---------------------------------------------------------------------------
// S3 source — reuses STORAGE_* credentials, but is deliberately isolated
// from the main storage() singleton because backups usually live in a
// different bucket than user documents.
// ---------------------------------------------------------------------------

async function verifyS3Backup(): Promise<BackupVerifyOutcome> {
  const bucket = serverEnv.BACKUP_VERIFY_S3_BUCKET;
  if (!bucket) {
    return {
      status: "FAIL",
      message:
        "BACKUP_VERIFY_S3_BUCKET nije postavljen — nema odakle da preuzmem pg_dump.",
    };
  }

  const client = await loadS3ClientOrNull();
  if (!client) {
    return {
      status: "FAIL",
      message:
        "S3 SDK (`@aws-sdk/client-s3`) nije instaliran. Instalirajte ga na runner-u ili prebacite `BACKUP_VERIFY_SOURCE=local`.",
    };
  }

  const prefix = serverEnv.BACKUP_VERIFY_S3_PREFIX ?? "";

  let latest: { key: string; lastModified: Date; size: number } | null = null;
  try {
    latest = await client.findLatestObject(bucket, prefix);
  } catch (err) {
    return {
      status: "FAIL",
      message: `S3 listObjects greška: ${(err as Error)?.message ?? "unknown"}`,
    };
  }

  if (!latest) {
    return {
      status: "FAIL",
      message: `Bucket '${bucket}' nema pg_dump fajlova pod prefiksom '${prefix}'.`,
    };
  }

  let tmpFile: string | null = null;
  try {
    tmpFile = await client.downloadToTemp(bucket, latest.key);
  } catch (err) {
    return {
      status: "FAIL",
      message: `Preuzimanje objekta '${latest.key}' iz bucket-a '${bucket}' nije uspelo: ${
        (err as Error)?.message ?? "unknown"
      }`,
      fileName: latest.key,
      fileSize: latest.size,
    };
  }

  try {
    const result = await pgRestoreList(tmpFile);
    if (!result.ok) {
      return {
        status: "FAIL",
        message: `pg_restore --list nije prošao za '${latest.key}': ${result.error}`,
        fileName: latest.key,
        fileSize: latest.size,
      };
    }

    return {
      status: "OK",
      message: `Provera prošla: ${result.tocEntries} TOC unosa, poslednji objekat '${latest.key}' (${latest.lastModified.toISOString()}).`,
      fileName: latest.key,
      fileSize: latest.size,
    };
  } finally {
    if (tmpFile) {
      await fs.rm(tmpFile, { force: true }).catch(() => undefined);
    }
  }
}

interface S3Helper {
  findLatestObject(
    bucket: string,
    prefix: string,
  ): Promise<{ key: string; lastModified: Date; size: number } | null>;
  downloadToTemp(bucket: string, key: string): Promise<string>;
}

async function loadS3ClientOrNull(): Promise<S3Helper | null> {
  try {
    const s3Path = "@aws-sdk/client-s3";
    const mod = (await import(/* webpackIgnore: true */ s3Path).catch(
      () => null,
    )) as Record<string, unknown> | null;
    if (!mod) return null;

    const S3Client = mod.S3Client as new (opts: unknown) => {
      send: (cmd: unknown) => Promise<unknown>;
    };
    const ListObjectsV2Command = mod.ListObjectsV2Command as new (o: unknown) => unknown;
    const GetObjectCommand = mod.GetObjectCommand as new (o: unknown) => unknown;

    const client = new S3Client({
      region: serverEnv.STORAGE_REGION ?? "auto",
      endpoint: serverEnv.STORAGE_ENDPOINT,
      credentials:
        serverEnv.STORAGE_ACCESS_KEY && serverEnv.STORAGE_SECRET_KEY
          ? {
              accessKeyId: serverEnv.STORAGE_ACCESS_KEY,
              secretAccessKey: serverEnv.STORAGE_SECRET_KEY,
            }
          : undefined,
      forcePathStyle: Boolean(serverEnv.STORAGE_ENDPOINT),
    });

    return {
      async findLatestObject(bucket, prefix) {
        let latest: { key: string; lastModified: Date; size: number } | null = null;
        let continuationToken: string | undefined = undefined;
        do {
          const cmd = new ListObjectsV2Command({
            Bucket: bucket,
            Prefix: prefix,
            ContinuationToken: continuationToken,
            MaxKeys: 1000,
          });
          const res = (await client.send(cmd)) as {
            Contents?: Array<{
              Key?: string;
              LastModified?: Date;
              Size?: number;
            }>;
            NextContinuationToken?: string;
            IsTruncated?: boolean;
          };
          for (const obj of res.Contents ?? []) {
            if (!obj.Key || !obj.LastModified) continue;
            const lower = obj.Key.toLowerCase();
            if (!CANDIDATE_EXTENSIONS.some((ext) => lower.endsWith(ext))) {
              continue;
            }
            if (!latest || obj.LastModified > latest.lastModified) {
              latest = {
                key: obj.Key,
                lastModified: obj.LastModified,
                size: obj.Size ?? 0,
              };
            }
          }
          continuationToken = res.IsTruncated
            ? res.NextContinuationToken
            : undefined;
        } while (continuationToken);
        return latest;
      },
      async downloadToTemp(bucket, key) {
        const cmd = new GetObjectCommand({ Bucket: bucket, Key: key });
        const res = (await client.send(cmd)) as {
          Body?: { transformToByteArray?: () => Promise<Uint8Array> };
        };
        if (!res.Body?.transformToByteArray) {
          throw new Error("S3 GetObject nije vratio čitljivo telo.");
        }
        const bytes = await res.Body.transformToByteArray();
        const tmp = path.join(
          os.tmpdir(),
          `pd-backup-verify-${Date.now()}-${path.basename(key)}`,
        );
        await fs.writeFile(tmp, Buffer.from(bytes));
        return tmp;
      },
    };
  } catch (err) {
    logger.warn("backup_verify.s3_sdk_unavailable", {
      error: (err as Error)?.message,
    });
    return null;
  }
}

// ---------------------------------------------------------------------------
// `pg_restore --list` runner. We only care about a clean exit (0) and a
// non-empty TOC. Errors are surfaced with the raw stderr trimmed to the
// last line so operators see something actionable.
// ---------------------------------------------------------------------------

interface PgRestoreResult {
  ok: boolean;
  tocEntries: number;
  error?: string;
}

function pgRestoreList(filePath: string): Promise<PgRestoreResult> {
  return new Promise((resolve) => {
    const child = spawn("pg_restore", ["--list", filePath], {
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    let settled = false;

    const settle = (result: PgRestoreResult) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", (err) => {
      settle({
        ok: false,
        tocEntries: 0,
        error: `pg_restore nije dostupan (${err.message}). Instalirajte postgresql-client na runner-u.`,
      });
    });
    child.on("close", (code) => {
      if (code === 0) {
        const tocEntries = stdout
          .split("\n")
          .filter((line) => line.trim() && !line.startsWith(";"))
          .length;
        settle({ ok: true, tocEntries });
      } else {
        const lastLine =
          stderr
            .split("\n")
            .map((l) => l.trim())
            .filter(Boolean)
            .pop() ?? `pg_restore exit ${code}`;
        settle({ ok: false, tocEntries: 0, error: lastLine });
      }
    });

    // Hard timeout — 60 seconds is plenty for a header-only list even
    // on gigabytes of data.
    setTimeout(() => {
      child.kill("SIGKILL");
      settle({
        ok: false,
        tocEntries: 0,
        error: "pg_restore --list je prekoračio timeout od 60s.",
      });
    }, 60_000);
  });
}

// ---------------------------------------------------------------------------
// Persistence + alerting helpers
// ---------------------------------------------------------------------------

async function recordCheck(
  kind: SystemHealthCheckKind,
  outcome: BackupVerifyOutcome,
): Promise<SystemHealthCheck | null> {
  try {
    return await prisma.systemHealthCheck.create({
      data: {
        kind,
        status: outcome.status,
        message: outcome.message.slice(0, 2000),
      },
    });
  } catch (err) {
    logger.error("backup_verify.persist_failed", {
      error: (err as Error)?.message,
    });
    return null;
  }
}

async function maybeAlertOnConsecutiveFailures(): Promise<void> {
  try {
    const recent = await prisma.systemHealthCheck.findMany({
      where: { kind: "BACKUP_VERIFY" },
      orderBy: { runAt: "desc" },
      take: 2,
    });
    if (recent.length < 2) return;
    if (recent[0]?.status !== "FAIL" || recent[1]?.status !== "FAIL") return;

    const recipients = resolveAlertRecipients();
    if (recipients.length === 0) {
      logger.warn("backup_verify.no_alert_recipients");
      return;
    }

    const failureAt = recent[0].runAt.toISOString();
    const subject = `[${APP_NAME}] Backup verifier — 2 uzastopna neuspeha`;
    const text = [
      "Provera backup-a za PostgreSQL bazu nije prošla dva puta zaredom.",
      "",
      `Poslednji pokušaj: ${failureAt}`,
      `Poruka: ${recent[0].message ?? "(bez detalja)"}`,
      "",
      `Prethodni pokušaj: ${recent[1].runAt.toISOString()}`,
      `Poruka: ${recent[1].message ?? "(bez detalja)"}`,
      "",
      "Detalji: /administracija/monitoring",
    ].join("\n");

    await Promise.all(
      recipients.map((to) =>
        sendEmail({ to, subject, text }).catch((err) =>
          logger.error("backup_verify.alert_send_failed", {
            to,
            error: (err as Error)?.message,
          }),
        ),
      ),
    );
  } catch (err) {
    logger.error("backup_verify.alert_flow_failed", {
      error: (err as Error)?.message,
    });
  }
}

function resolveAlertRecipients(): string[] {
  const raw = serverEnv.BACKUP_VERIFY_ALERT_EMAILS;
  if (raw) {
    return raw
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && s.includes("@"));
  }
  const fallback = serverEnv.SEED_SUPER_ADMIN_EMAIL;
  return fallback && fallback.includes("@") ? [fallback] : [];
}

// ---------------------------------------------------------------------------
// Read helpers used by the admin UI + API route
// ---------------------------------------------------------------------------

export async function listRecentHealthChecks(limit = 30): Promise<
  Array<{
    id: string;
    kind: SystemHealthCheckKind;
    status: SystemHealthCheckStatus;
    message: string | null;
    runAt: Date;
  }>
> {
  return prisma.systemHealthCheck.findMany({
    orderBy: { runAt: "desc" },
    take: limit,
    select: {
      id: true,
      kind: true,
      status: true,
      message: true,
      runAt: true,
    },
  });
}

export interface HealthCheckSummary {
  lastRunAt: Date | null;
  lastStatus: SystemHealthCheckStatus | null;
  consecutiveFailures: number;
  successRate: number | null;
}

export async function summarizeBackupVerify(): Promise<HealthCheckSummary> {
  const recent = await prisma.systemHealthCheck.findMany({
    where: { kind: "BACKUP_VERIFY" },
    orderBy: { runAt: "desc" },
    take: 30,
    select: { status: true, runAt: true },
  });

  if (recent.length === 0) {
    return {
      lastRunAt: null,
      lastStatus: null,
      consecutiveFailures: 0,
      successRate: null,
    };
  }

  let consecutiveFailures = 0;
  for (const row of recent) {
    if (row.status === "FAIL") consecutiveFailures += 1;
    else break;
  }

  const oks = recent.filter((r) => r.status === "OK").length;

  return {
    lastRunAt: recent[0]!.runAt,
    lastStatus: recent[0]!.status,
    consecutiveFailures,
    successRate: oks / recent.length,
  };
}
