import "server-only";

import { prisma } from "@/server/db/prisma";
import { DomainErrors } from "@/lib/errors";
import { projectCoverPublicPath } from "@/lib/geo/cover-image";
import { uploadDocument } from "@/server/services/documents.service";
import { storage } from "@/server/storage";

const COVER_MIME = new Set(["image/png", "image/jpeg", "image/webp"]);
const MAX_COVER_BYTES = 5 * 1024 * 1024;

export async function uploadProjectCoverImage(input: {
  organizationId: string;
  actorUserId: string;
  projectId?: string;
  fileName: string;
  mimeType: string;
  buffer: Buffer;
}) {
  if (!COVER_MIME.has(input.mimeType)) {
    throw DomainErrors.badRequest("Naslovna fotografija mora biti PNG, JPG ili WebP.");
  }
  if (!input.buffer.byteLength) {
    throw DomainErrors.badRequest("Datoteka je prazna.");
  }
  if (input.buffer.byteLength > MAX_COVER_BYTES) {
    throw DomainErrors.badRequest("Naslovna fotografija je prevelika (maksimalno 5 MB).");
  }

  const doc = await uploadDocument({
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    category: "PROJECT",
    entityType: input.projectId ? "Project" : "Organization",
    entityId: input.projectId ?? input.organizationId,
    visibility: "BUYER_SHARED",
    fileName: input.fileName,
    mimeType: input.mimeType,
    buffer: input.buffer,
  });

  return {
    documentId: doc.id,
    coverImageUrl: projectCoverPublicPath(doc.id),
  };
}

export async function resolvePublicProjectCover(documentId: string) {
  const doc = await prisma.document.findFirst({
    where: {
      id: documentId,
      deletedAt: null,
      mimeType: { startsWith: "image/" },
      visibility: { in: ["BUYER_SHARED", "AGENCY_SHARED"] },
    },
  });
  if (!doc) return null;

  const url = await storage().getSignedUrl(doc.storageKey, 300);
  if (url.startsWith("local:")) {
    const buffer = await storage().read(doc.storageKey);
    return {
      kind: "bytes" as const,
      buffer,
      mimeType: doc.mimeType,
      fileName: doc.originalFileName,
    };
  }
  return { kind: "redirect" as const, redirectUrl: url };
}
