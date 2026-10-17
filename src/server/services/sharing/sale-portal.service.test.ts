import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  shareLink: {
    findUnique: vi.fn(),
  },
}));

const uploadDocumentMock = vi.hoisted(() => vi.fn());

vi.mock("@/server/db/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/server/services/documents.service", () => ({
  uploadDocument: uploadDocumentMock,
}));
vi.mock("@/server/services/billing/ips-qr/serbian-provider", () => ({
  serbianIpsQrProvider: {},
}));
vi.mock("@/server/http/app-origin", () => ({
  appOrigin: () => "https://my.propertydesk.app",
}));

import { uploadSalePortalProof } from "./sale-portal.service";

const baseLink = {
  entityType: "Sale",
  entityId: "sale_1",
  organizationId: "org_1",
  createdByUserId: "user_1",
  revokedAt: null as Date | null,
  expiresAt: null as Date | null,
};

const buffer = Buffer.from("x");

beforeEach(() => {
  vi.clearAllMocks();
  uploadDocumentMock.mockResolvedValue({ id: "doc_1" });
});

describe("uploadSalePortalProof", () => {
  it("rejects a token that is not for a Sale", async () => {
    prismaMock.shareLink.findUnique.mockResolvedValue({
      ...baseLink,
      entityType: "Project",
    });
    await expect(
      uploadSalePortalProof({ token: "t", fileName: "a.pdf", mimeType: "application/pdf", buffer }),
    ).rejects.toThrow();
    expect(uploadDocumentMock).not.toHaveBeenCalled();
  });

  it("rejects a revoked token", async () => {
    prismaMock.shareLink.findUnique.mockResolvedValue({
      ...baseLink,
      revokedAt: new Date("2026-01-01"),
    });
    await expect(
      uploadSalePortalProof({ token: "t", fileName: "a.pdf", mimeType: "application/pdf", buffer }),
    ).rejects.toThrow();
    expect(uploadDocumentMock).not.toHaveBeenCalled();
  });

  it("rejects an expired token even if it is not revoked", async () => {
    // Regresija: pre fiksa je `expiresAt` bio ignorisan na POST ruti,
    // pa je napadač sa procurenim tokenom nastavljao da gura PDF-ove
    // i posle isteka.
    prismaMock.shareLink.findUnique.mockResolvedValue({
      ...baseLink,
      expiresAt: new Date(Date.now() - 60_000),
    });
    await expect(
      uploadSalePortalProof({ token: "t", fileName: "a.pdf", mimeType: "application/pdf", buffer }),
    ).rejects.toThrow();
    expect(uploadDocumentMock).not.toHaveBeenCalled();
  });

  it("accepts a token that is active and not expired", async () => {
    prismaMock.shareLink.findUnique.mockResolvedValue({
      ...baseLink,
      expiresAt: new Date(Date.now() + 60_000),
    });
    await uploadSalePortalProof({
      token: "t",
      fileName: "a.pdf",
      mimeType: "application/pdf",
      buffer,
    });
    expect(uploadDocumentMock).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org_1",
        entityType: "Sale",
        entityId: "sale_1",
      }),
    );
  });

  it("accepts a token without an expiry (indefinite link)", async () => {
    prismaMock.shareLink.findUnique.mockResolvedValue({ ...baseLink, expiresAt: null });
    await uploadSalePortalProof({
      token: "t",
      fileName: "a.pdf",
      mimeType: "application/pdf",
      buffer,
    });
    expect(uploadDocumentMock).toHaveBeenCalled();
  });
});
