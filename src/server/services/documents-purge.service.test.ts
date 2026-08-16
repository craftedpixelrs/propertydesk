import { beforeEach, describe, expect, it, vi } from "vitest";

const storageMock = vi.hoisted(() => ({
  delete: vi.fn(),
}));

const prismaMock = vi.hoisted(() => ({
  document: {
    findMany: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock("@/server/db/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/server/storage", () => ({ storage: () => storageMock }));
vi.mock("@/server/audit/audit", () => ({ recordAudit: vi.fn() }));
vi.mock("@/server/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

import { recordAudit } from "@/server/audit/audit";
import {
  DOCUMENT_STORAGE_RETENTION_DAYS,
  purgeExpiredDeletedDocuments,
} from "./documents-purge.service";

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.document.findMany.mockResolvedValue([]);
  prismaMock.document.update.mockResolvedValue({});
  storageMock.delete.mockResolvedValue(undefined);
});

describe("purgeExpiredDeletedDocuments", () => {
  it("keeps the retention window at 45 days", () => {
    expect(DOCUMENT_STORAGE_RETENTION_DAYS).toBe(45);
  });

  it("does nothing when no soft-deleted docs are old enough", async () => {
    const result = await purgeExpiredDeletedDocuments();
    expect(result).toEqual({ processed: 0, errors: 0 });
    expect(storageMock.delete).not.toHaveBeenCalled();
    expect(prismaMock.document.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          storagePurgedAt: null,
          deletedAt: { lte: expect.any(Date) },
        }),
      }),
    );
  });

  it("deletes the object then stamps storagePurgedAt", async () => {
    prismaMock.document.findMany.mockResolvedValue([
      {
        id: "doc-1",
        storageKey: "orgs/org-1/UNIT/old.png",
        organizationId: "org-1",
      },
    ]);

    const result = await purgeExpiredDeletedDocuments();

    expect(result).toEqual({ processed: 1, errors: 0 });
    expect(storageMock.delete).toHaveBeenCalledWith("orgs/org-1/UNIT/old.png");
    expect(prismaMock.document.update).toHaveBeenCalledWith({
      where: { id: "doc-1" },
      data: { storagePurgedAt: expect.any(Date) },
    });
    expect(recordAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "document.storage_purged",
        entityId: "doc-1",
      }),
    );
  });

  it("counts a failure and continues the batch", async () => {
    prismaMock.document.findMany.mockResolvedValue([
      {
        id: "doc-bad",
        storageKey: "orgs/org-1/UNIT/bad.png",
        organizationId: "org-1",
      },
      {
        id: "doc-ok",
        storageKey: "orgs/org-1/UNIT/ok.png",
        organizationId: "org-1",
      },
    ]);
    storageMock.delete
      .mockRejectedValueOnce(new Error("AccessDenied"))
      .mockResolvedValueOnce(undefined);

    const result = await purgeExpiredDeletedDocuments();

    expect(result).toEqual({ processed: 1, errors: 1 });
    expect(prismaMock.document.update).toHaveBeenCalledTimes(1);
    expect(prismaMock.document.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "doc-ok" } }),
    );
  });
});
