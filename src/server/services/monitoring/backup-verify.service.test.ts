import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Automatic backup verifier — safety net tests.
 *
 * The verifier must NEVER throw out of `runBackupVerify` (the cron
 * dispatcher relies on that promise resolving) and must always record
 * exactly one `SystemHealthCheck` row per run.
 */

const prismaMock = vi.hoisted(() => ({
  systemHealthCheck: {
    create: vi.fn(),
    findMany: vi.fn(),
  },
}));

const emailMock = vi.hoisted(() => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
}));

const envMock = vi.hoisted(() => ({
  serverEnv: {
    BACKUP_VERIFY_SOURCE: "disabled" as
      | "disabled"
      | "local"
      | "s3",
    BACKUP_VERIFY_LOCAL_DIR: undefined as string | undefined,
    BACKUP_VERIFY_S3_BUCKET: undefined as string | undefined,
    BACKUP_VERIFY_S3_PREFIX: undefined as string | undefined,
    BACKUP_VERIFY_ALERT_EMAILS: undefined as string | undefined,
    SEED_SUPER_ADMIN_EMAIL: "admin@propertydesk.test",
    STORAGE_REGION: undefined as string | undefined,
    STORAGE_ENDPOINT: undefined as string | undefined,
    STORAGE_ACCESS_KEY: undefined as string | undefined,
    STORAGE_SECRET_KEY: undefined as string | undefined,
  },
  emailFromHeader: () => "PropertyDesk <noreply@test>",
  publicEnv: {
    NEXT_PUBLIC_APP_NAME: "PropertyDesk",
  },
}));

vi.mock("@/server/db/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/server/auth/email", () => emailMock);
vi.mock("@/lib/env", () => envMock);
vi.mock("@/lib/constants/app", () => ({ APP_NAME: "PropertyDesk" }));
vi.mock("@/server/monitoring", () => ({ captureException: vi.fn() }));
vi.mock("@/server/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { runBackupVerify } from "./backup-verify.service";

beforeEach(() => {
  vi.clearAllMocks();
  envMock.serverEnv.BACKUP_VERIFY_SOURCE = "disabled";
  envMock.serverEnv.BACKUP_VERIFY_LOCAL_DIR = undefined;
  envMock.serverEnv.BACKUP_VERIFY_S3_BUCKET = undefined;
  envMock.serverEnv.BACKUP_VERIFY_ALERT_EMAILS = undefined;
  prismaMock.systemHealthCheck.create.mockImplementation(async ({ data }) => ({
    id: "check-1",
    runAt: new Date(),
    ...data,
  }));
  prismaMock.systemHealthCheck.findMany.mockResolvedValue([]);
});

describe("runBackupVerify (source=disabled)", () => {
  it("records an OK check with a clear message when disabled", async () => {
    const { outcome, check } = await runBackupVerify();

    expect(outcome.status).toBe("OK");
    expect(outcome.message).toContain("isključen");
    expect(check?.status).toBe("OK");
    expect(prismaMock.systemHealthCheck.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        kind: "BACKUP_VERIFY",
        status: "OK",
      }),
    });
  });

  it("does not send alert emails on a healthy run", async () => {
    await runBackupVerify();
    expect(emailMock.sendEmail).not.toHaveBeenCalled();
  });
});

describe("runBackupVerify (source=local)", () => {
  it("fails when the configured directory does not exist", async () => {
    envMock.serverEnv.BACKUP_VERIFY_SOURCE = "local";
    envMock.serverEnv.BACKUP_VERIFY_LOCAL_DIR =
      "D:/definitely/does/not/exist/pd-backup-verify-test";

    const { outcome } = await runBackupVerify();

    expect(outcome.status).toBe("FAIL");
    expect(outcome.message).toMatch(/Ne mogu da pročitam direktorijum|nema pg_dump/);
  });

  it("fails with an actionable message when BACKUP_VERIFY_LOCAL_DIR is empty", async () => {
    envMock.serverEnv.BACKUP_VERIFY_SOURCE = "local";
    envMock.serverEnv.BACKUP_VERIFY_LOCAL_DIR = undefined;

    const { outcome } = await runBackupVerify();

    expect(outcome.status).toBe("FAIL");
    expect(outcome.message).toContain("BACKUP_VERIFY_LOCAL_DIR");
  });
});

describe("runBackupVerify (source=s3)", () => {
  it("fails when the bucket is not configured", async () => {
    envMock.serverEnv.BACKUP_VERIFY_SOURCE = "s3";
    envMock.serverEnv.BACKUP_VERIFY_S3_BUCKET = undefined;

    const { outcome } = await runBackupVerify();

    expect(outcome.status).toBe("FAIL");
    expect(outcome.message).toContain("BACKUP_VERIFY_S3_BUCKET");
  });
});

describe("consecutive-failure alerting", () => {
  it("sends an alert email when the two most recent checks are FAIL", async () => {
    envMock.serverEnv.BACKUP_VERIFY_SOURCE = "local";
    envMock.serverEnv.BACKUP_VERIFY_LOCAL_DIR = undefined;
    envMock.serverEnv.BACKUP_VERIFY_ALERT_EMAILS =
      "ops@propertydesk.app, oncall@propertydesk.app";

    prismaMock.systemHealthCheck.findMany.mockResolvedValue([
      {
        id: "b",
        status: "FAIL",
        message: "still broken",
        runAt: new Date(Date.now()),
      },
      {
        id: "a",
        status: "FAIL",
        message: "broken",
        runAt: new Date(Date.now() - 1000),
      },
    ]);

    await runBackupVerify();

    expect(emailMock.sendEmail).toHaveBeenCalledTimes(2);
    expect(emailMock.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: "ops@propertydesk.app" }),
    );
    expect(emailMock.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: "oncall@propertydesk.app" }),
    );
  });

  it("does not alert when only the latest check is a failure", async () => {
    envMock.serverEnv.BACKUP_VERIFY_SOURCE = "local";
    envMock.serverEnv.BACKUP_VERIFY_LOCAL_DIR = undefined;
    envMock.serverEnv.BACKUP_VERIFY_ALERT_EMAILS = "ops@propertydesk.app";

    prismaMock.systemHealthCheck.findMany.mockResolvedValue([
      { id: "b", status: "FAIL", message: "just failed", runAt: new Date() },
      { id: "a", status: "OK", message: "fine", runAt: new Date() },
    ]);

    await runBackupVerify();

    expect(emailMock.sendEmail).not.toHaveBeenCalled();
  });
});
