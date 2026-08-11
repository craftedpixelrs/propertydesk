import "server-only";
import type { DocumentCategory, DocumentVisibility, Prisma } from "@prisma/client";

import { prisma } from "@/server/db/prisma";
import { DomainErrors } from "@/lib/errors";
import { recordAudit } from "@/server/audit/audit";
import {
  storage,
  assertAllowedMimeType,
  MAX_UPLOAD_BYTES,
} from "@/server/storage";

/**
 * DocumentService — thin wrapper around the storage abstraction that adds
 * organization scoping, category/visibility rules and audit logging.
 *
 * Access matrix (category × visibility):
 *
 *   category=BUYER + visibility=BUYER_SHARED  → buyer + investor team
 *   category=SALE  + visibility=INVESTOR_TEAM → investor team only
 *   category=AGENCY|COMMISSION + visibility=AGENCY_SHARED → agency users
 *   any            + visibility=INTERNAL      → investor OWNER / MANAGER only
 *
 * `getSignedDownloadUrl` is the single ingress used by the UI. It resolves
 * per-caller permissions before yielding a URL from the storage provider.
 */

export interface UploadDocumentInput {
  organizationId: string;
  actorUserId: string;
  category: DocumentCategory;
  entityType: string;
  entityId: string;
  visibility?: DocumentVisibility;
  fileName: string;
  mimeType: string;
  buffer: Buffer;
  expiresAt?: Date | null;
}

export interface ListDocumentsInput {
  organizationId: string;
  entityType: string;
  entityId: string;
  category?: DocumentCategory;
  /**
   * When true, restricts results to documents whose `mimeType` starts
   * with `image/`. Used by the photo-gallery on unit and project detail
   * pages.
   */
  imagesOnly?: boolean;
  /**
   * When true, filters OUT documents whose `mimeType` starts with
   * `image/`. Complement of `imagesOnly` — used by the sale detail's
   * "Dokumentacija jedinice" pane, which does not want to duplicate
   * the photo gallery.
   */
  excludeImages?: boolean;
  page: number;
  pageSize: number;
}

const AGENCY_VISIBLE: DocumentVisibility[] = ["AGENCY_SHARED", "BUYER_SHARED"];

function assertBuffer(buffer: Buffer): void {
  if (!buffer || buffer.byteLength === 0) {
    throw DomainErrors.badRequest("Datoteka je prazna.");
  }
  if (buffer.byteLength > MAX_UPLOAD_BYTES) {
    throw DomainErrors.badRequest(
      `Datoteka je prevelika (max ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)} MB).`,
    );
  }
}

export async function uploadDocument(input: UploadDocumentInput) {
  assertAllowedMimeType(input.mimeType);
  assertBuffer(input.buffer);

  const put = await storage().put({
    organizationId: input.organizationId,
    category: input.category,
    fileName: input.fileName,
    contentType: input.mimeType,
    body: input.buffer,
  });

  const doc = await prisma.document.create({
    data: {
      organizationId: input.organizationId,
      category: input.category,
      entityType: input.entityType,
      entityId: input.entityId,
      fileName: input.fileName,
      originalFileName: input.fileName,
      mimeType: input.mimeType,
      size: put.size,
      storageKey: put.storageKey,
      uploadedByUserId: input.actorUserId,
      visibility: input.visibility ?? "INTERNAL",
      expiresAt: input.expiresAt ?? null,
    },
  });

  await recordAudit({
    action: "document.uploaded",
    entityType: "Document",
    entityId: doc.id,
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    newValues: {
      category: doc.category,
      visibility: doc.visibility,
      size: doc.size,
      target: `${input.entityType}:${input.entityId}`,
    },
  });

  return doc;
}

export async function listDocuments(input: ListDocumentsInput) {
  const where: Prisma.DocumentWhereInput = {
    organizationId: input.organizationId,
    entityType: input.entityType,
    entityId: input.entityId,
    deletedAt: null,
    ...(input.category ? { category: input.category } : {}),
    ...(input.imagesOnly ? { mimeType: { startsWith: "image/" } } : {}),
    ...(input.excludeImages
      ? { NOT: { mimeType: { startsWith: "image/" } } }
      : {}),
  };
  // The gallery uses (sortOrder ASC, createdAt DESC) so operator drag
  // ordering wins, but new uploads that keep the default sortOrder are
  // still surfaced newest-first.
  const orderBy: Prisma.DocumentOrderByWithRelationInput[] = input.imagesOnly
    ? [{ isCover: "desc" }, { sortOrder: "asc" }, { createdAt: "desc" }]
    : [{ createdAt: "desc" }];
  const [total, rows] = await Promise.all([
    prisma.document.count({ where }),
    prisma.document.findMany({
      where,
      orderBy,
      skip: (input.page - 1) * input.pageSize,
      take: input.pageSize,
      include: {
        uploadedByUser: { select: { id: true, name: true } },
      },
    }),
  ]);
  return { items: rows, total };
}

/**
 * Flip the `isCover` flag on exactly one document within an entity. Any
 * existing cover on the same (entityType, entityId) is demoted in the
 * same transaction so there is never more than one cover per entity.
 */
export async function setCoverImage(input: {
  organizationId: string;
  actorUserId: string;
  documentId: string;
}) {
  const doc = await prisma.document.findFirst({
    where: {
      id: input.documentId,
      organizationId: input.organizationId,
      deletedAt: null,
    },
  });
  if (!doc) throw DomainErrors.notFound("Dokument");
  if (!doc.mimeType.startsWith("image/")) {
    throw DomainErrors.badRequest(
      "Naslovna slika mora biti slika (image/*).",
    );
  }

  await prisma.$transaction([
    prisma.document.updateMany({
      where: {
        organizationId: input.organizationId,
        entityType: doc.entityType,
        entityId: doc.entityId,
        deletedAt: null,
        isCover: true,
        NOT: { id: doc.id },
      },
      data: { isCover: false },
    }),
    prisma.document.update({
      where: { id: doc.id },
      data: { isCover: true },
    }),
  ]);

  await recordAudit({
    action: "document.set_cover",
    entityType: "Document",
    entityId: doc.id,
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    newValues: { target: `${doc.entityType}:${doc.entityId}` },
  });
}

/**
 * Persist a full ordering of documents for a single entity. `ids` must
 * all belong to the same (entityType, entityId) tuple owned by the
 * caller organization — a mismatch aborts the whole transaction so
 * partial reorders never occur.
 */
export async function reorderDocuments(input: {
  organizationId: string;
  actorUserId: string;
  entityType: string;
  entityId: string;
  orderedDocumentIds: string[];
}) {
  if (input.orderedDocumentIds.length === 0) return;
  const docs = await prisma.document.findMany({
    where: {
      id: { in: input.orderedDocumentIds },
      organizationId: input.organizationId,
      entityType: input.entityType,
      entityId: input.entityId,
      deletedAt: null,
    },
    select: { id: true },
  });
  if (docs.length !== input.orderedDocumentIds.length) {
    throw DomainErrors.badRequest(
      "Neki dokumenti ne pripadaju ovom entitetu.",
    );
  }
  await prisma.$transaction(
    input.orderedDocumentIds.map((id, index) =>
      prisma.document.update({
        where: { id },
        data: { sortOrder: index },
      }),
    ),
  );

  await recordAudit({
    action: "document.reordered",
    entityType: "Document",
    entityId: input.orderedDocumentIds[0]!,
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    newValues: {
      target: `${input.entityType}:${input.entityId}`,
      count: input.orderedDocumentIds.length,
    },
  });
}

export async function softDeleteDocument(input: {
  organizationId: string;
  actorUserId: string;
  documentId: string;
}) {
  const existing = await prisma.document.findFirst({
    where: {
      id: input.documentId,
      organizationId: input.organizationId,
      deletedAt: null,
    },
  });
  if (!existing) throw DomainErrors.notFound("Dokument");
  const updated = await prisma.document.update({
    where: { id: existing.id },
    data: { deletedAt: new Date() },
  });
  await recordAudit({
    action: "document.deleted",
    entityType: "Document",
    entityId: existing.id,
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
  });
  return updated;
}

export interface DocumentAccessContext {
  organizationId: string;
  organizationType: "INVESTOR" | "AGENCY" | "PLATFORM";
  userId: string;
  /**
   * For agency callers: the investor org whose data they're consuming. When
   * set, and `organizationType === "AGENCY"`, we treat the document owner as
   * the investor and verify an active connection.
   */
  investorOrganizationId?: string | null;
}

/**
 * Resolve download authorisation and return a storage-signed URL.
 *
 * The Local provider returns a `local:<key>` sentinel — the API route is
 * expected to stream the file via `storage().read()` when it sees that
 * scheme. This keeps callsites uniform.
 */
export async function getSignedDownloadUrl(input: {
  actor: DocumentAccessContext;
  documentId: string;
  expiresInSec?: number;
}) {
  const doc = await prisma.document.findFirst({
    where: { id: input.documentId, deletedAt: null },
  });
  if (!doc) throw DomainErrors.notFound("Dokument");

  // Investor + platform callers can access their own org's documents.
  if (
    (input.actor.organizationType === "INVESTOR" ||
      input.actor.organizationType === "PLATFORM") &&
    doc.organizationId === input.actor.organizationId
  ) {
    // INTERNAL is fine for these; further role gating is the API layer's job.
    const url = await storage().getSignedUrl(doc.storageKey, input.expiresInSec);
    return { doc, url };
  }

  // Agency callers can only see documents that (a) belong to a connected
  // investor and (b) are shared with the agency channel.
  if (input.actor.organizationType === "AGENCY") {
    if (!AGENCY_VISIBLE.includes(doc.visibility)) {
      throw DomainErrors.forbidden("Nemate pristup ovom dokumentu.");
    }
    const connection = await prisma.agencyConnection.findFirst({
      where: {
        investorOrganizationId: doc.organizationId,
        agencyOrganizationId: input.actor.organizationId,
        status: "ACTIVE",
      },
      select: { id: true },
    });
    if (!connection) {
      throw DomainErrors.forbidden("Nemate pristup ovom dokumentu.");
    }
    const url = await storage().getSignedUrl(doc.storageKey, input.expiresInSec);
    return { doc, url };
  }

  throw DomainErrors.forbidden("Nemate pristup ovom dokumentu.");
}
