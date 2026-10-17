import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  document: {
    findFirst: vi.fn(),
  },
}));

const storageMock = vi.hoisted(() => ({
  getSignedUrl: vi.fn(),
  read: vi.fn(),
}));

vi.mock("@/server/db/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/server/storage", () => ({ storage: () => storageMock }));
vi.mock("@/server/services/documents.service", () => ({ uploadDocument: vi.fn() }));

import { resolvePublicProjectCover } from "./cover-image.service";

beforeEach(() => {
  vi.clearAllMocks();
  storageMock.getSignedUrl.mockResolvedValue("https://cdn/pub");
});

describe("resolvePublicProjectCover", () => {
  it("filters strictly to Project + PROJECT + BUYER_SHARED", async () => {
    // Regresija: ranija verzija je uključivala i AGENCY_SHARED (čime je
    // dokumente namenjene partnerskim agencijama servirala svima sa
    // document ID-jem, zaobilazeći AgencyConnection check).
    prismaMock.document.findFirst.mockResolvedValue(null);
    await resolvePublicProjectCover("doc_1");
    expect(prismaMock.document.findFirst).toHaveBeenCalledWith({
      where: {
        id: "doc_1",
        deletedAt: null,
        entityType: "Project",
        category: "PROJECT",
        mimeType: { startsWith: "image/" },
        visibility: "BUYER_SHARED",
      },
    });
  });

  it("returns null when no doc matches the strict filter", async () => {
    prismaMock.document.findFirst.mockResolvedValue(null);
    await expect(resolvePublicProjectCover("doc_x")).resolves.toBeNull();
  });

  it("returns a redirect when storage returns a signed URL", async () => {
    prismaMock.document.findFirst.mockResolvedValue({
      id: "doc_1",
      storageKey: "k",
      mimeType: "image/png",
      originalFileName: "a.png",
    });
    const resolved = await resolvePublicProjectCover("doc_1");
    expect(resolved).toEqual({ kind: "redirect", redirectUrl: "https://cdn/pub" });
  });
});
